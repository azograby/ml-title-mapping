import pandas as pd
import boto3
import os
import json
import logging
from opensearchpy import OpenSearch, RequestsHttpConnection, AWSV4SignerAuth

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

dynamodb = boto3.resource('dynamodb')

def get_parameters():
    """Get parameters from AWS Parameter Store"""
    ssm = boto3.client('ssm')
    response = ssm.get_parameters_by_path(
        Path='/' + os.environ.get('AWS_BRANCH') + '/',
        WithDecryption=True
    )
    params = {}
    for param in response['Parameters']:
        name = param['Name'].split('/')[-1]
        params[name] = param['Value']
    return params 

params = get_parameters()
bedrock_runtime = boto3.client('bedrock-runtime')

def lambda_handler(event, context):
    try:
        credentials = boto3.Session().get_credentials()
        auth = AWSV4SignerAuth(credentials, os.environ.get('AWS_REGION'), 'aoss')
        
        # Get OpenSearch endpoint from SSM
        opensearch_endpoint = params.get('OPENSEARCH_ENDPOINT')
        host = opensearch_endpoint.replace('https://', '')

        # create an opensearch client and use the request-signer
        client = OpenSearch(
            hosts=[{'host': host, 'port': 443}],
            http_auth=auth,
            use_ssl=True,
            verify_certs=True,
            connection_class=RequestsHttpConnection,
            pool_maxsize=20,
        )

        try:
            request = json.loads(event.get('body'))
        except json.JSONDecodeError as e:
            print(f"JSON decode error: {e}")
            raise

        opensearch_query = request.get("opensearchQuery")
        query = opensearch_query.get("searchConfig")
        
        # If searchConfig is a string, parse it as JSON
        if isinstance(query, str):
            try:
                query = json.loads(query)
            except json.JSONDecodeError as e:
                print(f"Failed to parse searchConfig JSON string: {e}")
                raise ValueError(f"Invalid JSON in searchConfig: {e}")

        for query_type in ['must', 'should']:
            if query_type not in query['query']['bool']:
                continue
            
            queries = query['query']['bool'][query_type]
            
            for i in range(len(queries) - 1, -1, -1):
                subquery = queries[i]
                if not isinstance(subquery, dict) or 'function_score' not in subquery:
                    continue
                
                function_score_query = subquery['function_score']['query']
                
                if 'knn' in function_score_query:
                    # Handle KNN queries
                    knn_obj = function_score_query['knn']
                    if not isinstance(knn_obj, dict):
                        continue
                    
                    first_key = next(iter(knn_obj)) # e.g. actorsEmbedding
                    first_key_without_embedding = first_key.replace('Embedding', '') # e.g. actors
                    
                    # Get the value and apply deduplication if needed
                    value = request.get(first_key_without_embedding)
                    
                    if value == '':
                        queries.pop(i)
                        continue
                        
                    # some of these fields include a lot of duplicate names and are indexed and embedded with duplicates removed, so we need to remove here also
                    if first_key_without_embedding in ['producers', 'directors', 'writers', 'actors']:
                        value = remove_duplicate_names(value)
                    
                    #get embedding, but remove "Embedding from key name"
                    bedrock_response = bedrock_runtime.invoke_model(
                        modelId="cohere.embed-multilingual-v3",
                        body=json.dumps({
                            "input_type": "search_document",
                            "texts": [value],
                            "truncate": "NONE"
                        })
                    )

                    bedrock_result = json.loads(bedrock_response['body'].read())
                    
                    embeddings = bedrock_result.get('embeddings', [])
                    embedding = embeddings[0]
                    knn_obj[first_key]['vector'] = embedding
                    
                    # Add _name field for vector queries
                    if '_name' not in subquery['function_score']:
                        subquery['function_score']['_name'] = f"{first_key}_function"
                    
                elif 'term' in function_score_query:
                    # Handle term queries
                    term_obj = function_score_query['term']
                    if not isinstance(term_obj, dict):
                        continue
                    
                    first_key = next(iter(term_obj))
                    field_value = request.get(first_key)
                    
                    # Don't try to look for similarity if the source record doesn't have a value
                    if field_value == '' or field_value is None:
                        queries.pop(i)
                        continue
                    
                    term_obj[first_key] = field_value
                    
                    # Add _name field for exact queries
                    if '_name' not in subquery['function_score']:
                        subquery['function_score']['_name'] = f"{first_key}_function"

        print(f"Final query: {json.dumps(query, default=str)}")
        
        # Post to OpenSearch to find k-NN + hybrid search query
        response = client.search(
            body = query,
            index = request.get('indexName')
        )
        
        item_results = response['hits']['hits']
        
        # iterate over the item_results array, and remove certain keys
        for item_result in item_results:
            item_result.pop('_index', None)
            item_result.pop('_id', None)

            if '_source' in item_result and isinstance(item_result['_source'], dict):
                # Remove any field that ends with "Embedding"
                embedding_fields = [key for key in item_result['_source'].keys() if key.endswith('Embedding')]
                for field in embedding_fields:
                    item_result['_source'].pop(field, None)
            
        return {
            'statusCode': 200,
            'body': json.dumps({
                '_totalResults': response['hits']['total']['value'],
                '_maxScore': response['hits']['max_score'],
                '_items': item_results
            }),
            'headers': {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "*",
                "Content-Type": "application/json"
            }
        }
    except Exception as e:
        print(f"Lambda handler error: {type(e).__name__}: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({
                'error': str(e),
                'error_type': type(e).__name__
            }),
            'headers': {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "*",
                "Content-Type": "application/json"
            }
        }
    
def remove_duplicate_names(csv_string):
    """
    Removes duplicate names from a comma-separated string while preserving order.
    """
    if not csv_string or not csv_string.strip():
        return csv_string
    
    names = [name.strip() for name in csv_string.split(',') if name.strip()]
    seen = set()
    unique_names = []
    
    for name in names:
        if name not in seen:
            seen.add(name)
            unique_names.append(name)
    
    return ', '.join(unique_names)