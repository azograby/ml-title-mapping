import pandas as pd
import boto3
import os
import json
from opensearchpy import OpenSearch, RequestsHttpConnection, AWSV4SignerAuth

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
# film_titles_processing_queue_table = params.get('FILM_TITLES_PROCESSING_QUEUE_TABLE')

# Initialize Bedrock client
bedrock_runtime = boto3.client('bedrock-runtime')

def lambda_handler(event, context):
    # table = dynamodb.Table(film_titles_processing_queue_table)
    # response = table.scan(Limit=limit)
    try:
        print(f"event: {event}")

        credentials = boto3.Session().get_credentials()
        auth = AWSV4SignerAuth(credentials, os.environ.get('AWS_REGION'), 'aoss')
        host = 'vh13k6ixzvrd1c0dcv0m.us-west-2.aoss.amazonaws.com'  # serverless collection endpoint, without https://

        # create an opensearch client and use the request-signer
        client = OpenSearch(
            hosts=[{'host': host, 'port': 443}],
            http_auth=auth,
            use_ssl=True,
            verify_certs=True,
            connection_class=RequestsHttpConnection,
            pool_maxsize=20,
        )

        request = json.loads(event.get('body'))





        # try:
        #     index_info = client.indices.get(index='films2')
        #     print(f"*******Information for index")
        #     print(index_info)
        # except Exception as e:
        #     print(f"Error getting index information: {e}")

        # return

        # TODO: allow term to be in must/should
        # TODO: allow vector to be in must/should

            

        # mam_UUID = request.get('mamUUID')
        # content_type = request.get('contentType')
        # status = request.get('status')
        # region = request.get('region')
        # partner = request.get('partner')
        # partner_ID = request.get('partnerID')
        # title = request.get('title')
        # language = request.get('language')
        # eidr = request.get('eidr')
        # imdb = request.get('imdb')
        # genre = request.get('genre')
        # subgenre = request.get('subgenre')
        # category = request.get('category')
        # subcategory = request.get('subcategory')
        # release_date = request.get('releaseDate')
        # duration = request.get('duration')
        # production_country = request.get('productionCountry')
        # production_year = request.get('productionYear')
        # production_company = request.get('productionCompany')
        # rating = request.get('rating')
        # rating_descriptors = request.get('ratingDescriptors')
        # producers = request.get('producers')
        # directors = request.get('directors')
        # writers = request.get('writers')
        # actors = request.get('actors')
        # short_description = request.get('shortDescription')
        # long_description = request.get('longDescription')

        query = request.get("opensearchQuery")

        for query_type in ['must', 'should']:
            queries = query['query']['bool'][query_type]
            for i in range(len(queries) - 1, -1, -1):
                subquery = queries[i]
                function_score_query = subquery['function_score']['query']
                
                if 'knn' in function_score_query:
                    # Handle KNN queries
                    knn_obj = function_score_query['knn']
                    first_key = next(iter(knn_obj)) # e.g. actorsEmbedding
                    first_key_without_embedding = first_key.replace('Embedding', '') # e.g. actors
                    
                    # Get the value and apply deduplication if needed
                    value = request.get(first_key_without_embedding)
                    
                    if value == '':
                        print(f'*******REMOVING THIS FIELD FROM THE QUERY BECAUSE IT IS EMPTY: {first_key_without_embedding}')
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

                    embedding = json.loads(bedrock_response['body'].read()).get('embeddings', [])[0]
                    knn_obj[first_key]['vector'] = embedding
                    
                elif 'term' in function_score_query:
                    # Handle term queries
                    term_obj = function_score_query['term']
                    first_key = next(iter(term_obj))
                    term_obj[first_key]['value'] = request.get(first_key)

                    if request.get(first_key) == '':
                        print(f'*******REMOVING THIS FIELD FROM THE QUERY BECAUSE IT IS EMPTY: {first_key}')
                        queries.pop(i)


        print(query)
        # query = {
        #     "size": 15,
        #     'query': {
        #         'bool': {
        #             'must': [
        #                 {
        #                     "function_score": {
        #                         "query": {
        #                             "knn": {
        #                                 "long-description-embedding": {
        #                                     "vector": long_description_embedding,
        #                                     "min_score": "0.4",
        #                                     # "k": "5"
        #                                 },
        #                             }
        #                         },
        #                         "weight": 0.25,
        #                     }
        #                 },
        #                 {
        #                     "function_score": {
        #                         "query": {
        #                             "knn": {
        #                                 "film-type-embedding": {
        #                                     "vector": film_type_embedding,
        #                                     "min_score": "0.2",
        #                                     # "k": "5"
        #                                 },
        #                             }
        #                         },
        #                         "weight": 0.15,
        #                     }
        #                 },
        #                 {
        #                     "function_score": {
        #                         "query": {
        #                             "knn": {
        #                                 "title-embedding": {
        #                                     "vector": title_embedding,
        #                                     "min_score": "0.3",
        #                                     # "k": "5"
        #                                 },
        #                             }
        #                         },
        #                         "weight": 0.6,
        #                     }
        #                 },
                        
        #             ],
                    # 'should': [
                    #     {
                    #         "function_score": {
                    #             "query": {
                    #                 "term": {"duration": duration}
                    #             },
                    #             "boost": 200000,
                    #             "weight": 1000000,
                    #         }
                    #     }
                    # ]
        #         }
        #     }
        # }

        # Post to OpenSearch to find k-NN + hybrid search query
        response = client.search(
            body = query,
            index = 'films2'
        )

        title_results = response['hits']['hits']
        # iterate over the title_results array, and remove certain keys
        for title_result in title_results:
            title_result.pop('_index', None)
            title_result.pop('_id', None)

            title_result['_source'].pop('titleEmbedding', None)
            title_result['_source'].pop('actorsEmbedding', None)
            title_result['_source'].pop('directorsEmbedding', None)
            title_result['_source'].pop('producersEmbedding', None)
            title_result['_source'].pop('writersEmbedding', None)
            title_result['_source'].pop('longDescriptionEmbedding', None)

        print(title_results)
            
        return {
            'statusCode': 200,
            'body': json.dumps({
                '_totalResults': response['hits']['total']['value'],
                '_maxScore': response['hits']['max_score'],
                '_titles': title_results
            }),
            'headers': {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "*",
                "Content-Type": "application/json"
            }
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)}),
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