import json
import os
import boto3
from datetime import datetime, timezone
from opensearchpy import OpenSearch, RequestsHttpConnection, AWSV4SignerAuth

def to_camel_case(snake_str):
    # Handle spaces and convert to camelCase
    components = snake_str.replace('_', ' ').split(' ')
    # Filter out empty components
    components = [comp for comp in components if comp]
    if not components:
        return snake_str.lower()
    return components[0].lower() + ''.join(word.capitalize() for word in components[1:])

def generate_search_config(field_config):
    must_queries = []
    should_queries = []
    
    for field_name, field_type in field_config.items():
        if field_type == 'IGNORE':
            continue
            
        camel_case_name = to_camel_case(field_name)
        
        if field_type == 'VECTOR':
            query = {
                "function_score": {
                    "query": {
                        "knn": {
                            f"{camel_case_name}Embedding": {
                                "vector": f"{camel_case_name}Embedding",
                                "min_score": 0.5
                            }
                        }
                    },
                    "weight": 1.0,
                    "_name": f"{camel_case_name}Embedding_function"
                }
            }
            should_queries.append(query)
        elif field_type == 'EXACT':
            query = {
                "function_score": {
                    "query": {
                        "term": {
                            camel_case_name: {
                                "value": camel_case_name
                            }
                        }
                    },
                    "weight": 1.0,
                    "_name": f"{camel_case_name}_function"
                }
            }
            should_queries.append(query)
    
    return {
        "size": 15,
        "explain": True,
        "query": {
            "bool": {
                "minimum_should_match": "0",
                "must": must_queries,
                "should": should_queries
            }
        }
    }

def generate_opensearch_index_request(field_config):
    settings = {
        "index.knn": True,
        "knn.algo_param.ef_search": 512,
        "number_of_shards": 2
    }
    
    properties = {}
    
    for field_name, field_type in field_config.items():
        if field_type == 'IGNORE':
            continue
            
        camel_case_name = to_camel_case(field_name)
        
        if field_type == 'VECTOR':
            embedding_name = f"{camel_case_name}Embedding"
            properties[embedding_name] = {
                "type": "knn_vector",
                "dimension": 1024,
                "method": {
                    "name": "hnsw",
                    "space_type": "l2",
                    "engine": "faiss",
                    "parameters": {
                        "ef_construction": 15000,
                        "m": 100
                    }
                }
            }
            properties[camel_case_name] = {
                "type": "keyword"
            }
        elif field_type == 'EXACT':
            properties[camel_case_name] = {
                "type": "keyword"
            }
    
    return {
        "settings": settings,
        "mappings": {
            "properties": properties
        }
    }

def lambda_handler(event, context):
    try:
        body = json.loads(event['body']) if isinstance(event.get('body'), str) else event.get('body', {})
        field_configuration = body.get('fieldConfiguration', {})
        index_name = body.get('indexName')
        file_name = body.get('fileName', '')
        user_id = body.get('userId', '')
        
        # Generate OpenSearch index request
        index_request = generate_opensearch_index_request(field_configuration)
        
        # Get OpenSearch endpoint from SSM
        ssm = boto3.client('ssm')
        branch = os.environ.get('AWS_BRANCH')
        endpoint_param = ssm.get_parameter(Name=f'/{branch}/OPENSEARCH_ENDPOINT')
        host = endpoint_param['Parameter']['Value'].replace('https://', '')
        
        # Set up OpenSearch client
        credentials = boto3.Session().get_credentials()
        auth = AWSV4SignerAuth(credentials, os.environ.get('AWS_REGION'), 'aoss')
        
        client = OpenSearch(
            hosts=[{'host': host, 'port': 443}],
            http_auth=auth,
            use_ssl=True,
            verify_certs=True,
            connection_class=RequestsHttpConnection,
            pool_maxsize=20,
        )
        
        # Get existing indexes and find next item index number
        if not index_name:
            try:
                # Get all indices at once (no pagination needed for cat.indices)
                indices_response = client.cat.indices(format='json', h='index')
                all_indices = [idx['index'] for idx in indices_response] if indices_response else []
            except Exception:
                all_indices = []
            
            item_indexes = [idx for idx in all_indices if idx.startswith('item') and len(idx) > 4 and idx[4:7].isdigit()]
            next_num = max([int(idx[4:7]) for idx in item_indexes], default=0) + 1
            index_name = f"item{next_num:03d}-{user_id}"
        
        # Create index if it doesn't exist
        if not client.indices.exists(index=index_name):
            response = client.indices.create(index=index_name, body=index_request)
            
            # Generate and save search config
            search_config = generate_search_config(field_configuration)
            
            # Save configuration to DynamoDB
            dynamodb = boto3.resource('dynamodb')
            table_name_param = ssm.get_parameter(Name=f'/{branch}/INDEX_CONFIG_TABLE')
            table = dynamodb.Table(table_name_param['Parameter']['Value'])
            
            vector_fields = [field for field, type_ in field_configuration.items() if type_ == 'VECTOR']
            exact_fields = [field for field, type_ in field_configuration.items() if type_ == 'EXACT']
            
            table.put_item(
                Item={
                    'indexName': index_name,
                    'fileName': file_name,
                    'vectorFieldList': vector_fields,
                    'exactFieldList': exact_fields,
                    'userId': user_id,
                    'searchConfig': json.dumps(search_config),
                    # Format to ISO and replace +00:00 with "Z"
                    'updatedAt': datetime.now(timezone.utc).isoformat(timespec='milliseconds').replace('+00:00', 'Z'),
                    'createdAt': datetime.now(timezone.utc).isoformat(timespec='milliseconds').replace('+00:00', 'Z'),
                }
            )
            
            return {
                'statusCode': 200,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
                    'Access-Control-Allow-Methods': 'POST,OPTIONS',
                    'Content-Type': 'application/json'
                },
                'body': json.dumps({
                    'message': f'Index {index_name} created successfully',
                    'indexRequest': index_request,
                    'response': response
                })
            }
        else:
            return {
                'statusCode': 200,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
                    'Access-Control-Allow-Methods': 'POST,OPTIONS',
                    'Content-Type': 'application/json'
                },
                'body': json.dumps({
                    'message': f'Index {index_name} already exists',
                    'indexRequest': index_request
                })
            }
            
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
                'Access-Control-Allow-Methods': 'POST,OPTIONS',
                'Content-Type': 'application/json'
            },
            'body': json.dumps({
                'error': str(e)
            })
        }