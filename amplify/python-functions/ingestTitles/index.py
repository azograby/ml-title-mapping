import os
import pandas as pd
import boto3
import json
import urllib.parse
import tempfile
from datetime import datetime, timezone
from opensearchpy import OpenSearch, RequestsHttpConnection, AWSV4SignerAuth
 
dynamodb = boto3.client('dynamodb')
dynamodb_resource = boto3.resource('dynamodb')
bedrock_runtime = boto3.client('bedrock-runtime')

def get_parameters():
    """Get parameters from AWS Parameter Store"""
    ssm = boto3.client('ssm')

    # Get all parameters with path prefix
    response = ssm.get_parameters_by_path(
        Path='/' + os.environ.get('AWS_BRANCH') + '/',
        WithDecryption=True
    )
    
    # Convert list of parameters to dict
    params = {}
    for param in response['Parameters']:
        # Extract parameter name after the path prefix
        name = param['Name'].split('/')[-1]
        params[name] = param['Value']
        
    return params 

# Get parameters from Parameter Store
params = get_parameters()
film_titles_processing_queue_table = params.get('FILM_TITLES_PROCESSING_QUEUE_TABLE')

def lambda_handler(event, context):
    """    
    This function:
    1. Processes the event when a file is uploaded to S3
    2. Reads the excel file contents
    3. Indexes the titles into OpenSearch
    4. Adds the titles to the processing queue DynamoDB table
    
    Parameters:
    - event: Lambda event containing:
        - key: S3 key of the file
    - context: Lambda context
    
    """
    try:
        print(f"event: {event['Records'][0]}")

        bucket = event['Records'][0]['s3']['bucket']['name']
        file_key = urllib.parse.unquote_plus(event['Records'][0]['s3']['object']['key'], encoding='utf-8')

        # if bucket or file key is empty, return error
        if not bucket or not file_key:
            return {
                'statusCode': 400,
                'error': 'Missing required parameters'
            }

        # Initialize S3 client
        s3_client = boto3.client('s3')
        
        # Download file from S3
        # get the file extension from the file key
        file_suffix = "." + file_key.split('.')[-1]

        with tempfile.NamedTemporaryFile(delete=False, suffix=file_suffix) as tmp_file:
            s3_client.download_file(bucket, file_key, tmp_file.name)
            file_path = tmp_file.name

        print(f"file path: {file_path}")

        credentials = boto3.Session().get_credentials()
        auth = AWSV4SignerAuth(credentials, os.environ.get('AWS_REGION'), 'aoss')
        host = 'vh13k6ixzvrd1c0dcv0m.us-west-2.aoss.amazonaws.com'  # serverless collection endpoint, without https://
        index_name = 'films2'

        # create an opensearch client and use the request-signer
        client = OpenSearch(
            hosts=[{'host': host, 'port': 443}],
            http_auth=auth,
            use_ssl=True,
            verify_certs=True,
            connection_class=RequestsHttpConnection,
            pool_maxsize=20,
        )

        # create index
        if not client.indices.exists(index=index_name):
            client.indices.create(
                index=index_name,
                body={
                    "settings": {
                        "index.knn": True,
                        "knn.algo_param.ef_search": 512,
                        "number_of_shards": 2
                    },
                    "mappings": {
                        "properties": {
                            "actorsEmbedding": {
                                "type": "knn_vector",
                                "dimension": 1024,
                                "method": {
                                    "name": "hnsw",
                                    "space_type": "l2",
                                    "engine": "faiss",
                                    "parameters": {
                                        "ef_construction": 15000, "m": 100
                                    }
                                }
                            },
                            "directorsEmbedding": {
                                "type": "knn_vector",
                                "dimension": 1024,
                                "method": {
                                    "name": "hnsw",
                                    "space_type": "l2",
                                    "engine": "faiss",
                                    "parameters": {
                                        "ef_construction": 15000, "m": 100
                                    }
                                }
                            },
                            "longDescriptionEmbedding": {
                                "type": "knn_vector",
                                "dimension": 1024,
                                "method": {
                                    "name": "hnsw",
                                    "space_type": "l2",
                                    "engine": "faiss",
                                    "parameters": {
                                        "ef_construction": 15000, "m": 100
                                    }
                                }
                            },
                            "producersEmbedding": {
                                "type": "knn_vector",
                                "dimension": 1024,
                                "method": {
                                    "name": "hnsw",
                                    "space_type": "l2",
                                    "engine": "faiss",
                                    "parameters": {
                                        "ef_construction": 15000, "m": 100
                                    }
                                }
                            },
                            "titleEmbedding": {
                                "type": "knn_vector",
                                "dimension": 1024,
                                "method": {
                                    "name": "hnsw",
                                    "space_type": "l2",
                                    "engine": "faiss",
                                    "parameters": {
                                        "ef_construction": 15000, "m": 100
                                    }
                                }
                            },
                            "writersEmbedding": {
                                "type": "knn_vector",
                                "dimension": 1024,
                                "method": {
                                    "name": "hnsw",
                                    "space_type": "l2",
                                    "engine": "faiss",
                                    "parameters": {
                                        "ef_construction": 15000, "m": 100
                                    }
                                }
                            },
                            "actors": {
                                "type": "keyword"
                            },
                            "category": {
                                "type": "keyword"
                            },
                            "contentType": {
                                "type": "keyword"
                            },
                            "directors": {
                                "type": "keyword"
                            },
                            "duration": {
                                "type": "keyword"
                            },
                            "eidr": {
                                "type": "keyword"
                            },
                            "genre": {
                                "type": "keyword"
                            },
                            "imdb": {
                                "type": "keyword"
                            },
                            "language": {
                                "type": "keyword"
                            },
                            "longDescription": {
                                "type": "keyword"
                            },
                            "mamUUID": {
                                "type": "keyword"
                            },
                            "partner": {
                                "type": "keyword"
                            },
                            "partnerID": {
                                "type": "keyword"
                            },
                            "producers": {
                                "type": "keyword"
                            },
                            "productionCompany": {
                                "type": "keyword"
                            },
                            "productionCountry": {
                                "type": "keyword"
                            },
                            "productionYear": {
                                "type": "keyword"
                            },
                            "rating": {
                                "type": "keyword"
                            },
                            "ratingDescriptors": {
                                "type": "keyword"
                            },
                            "region": {
                                "type": "keyword"
                            },
                            "releaseDate": {
                                "type": "keyword"
                            },
                            "shortDescription": {
                                "type": "keyword"
                            },
                            "status": {
                                "type": "keyword"
                            },
                            "subcategory": {
                                "type": "keyword"
                            },
                            "subgenre": {
                                "type": "keyword"
                            },
                            "title": {
                                "type": "keyword"
                            },
                            "writers": {
                                "type": "keyword"
                            }
                        }
                    }
                }
            )

        try:
            df = pd.read_excel(file_path, na_filter = False)
            print(f"Successfully loaded titles file")
        except Exception as e:
            print(f"Error loading titles file: {e}")
            return
        
        # Process each row
        successful_posts = 0
        for index, row in df.iterrows():
            try:
                # Extract fields from Excel columns
                mam_UUID = str(row.get('MAM UUID', ''))
                content_type = str(row.get('Content Type', ''))
                status = str(row.get('Status', ''))
                region = str(row.get('Region', ''))
                partner = str(row.get('Partner', ''))
                partner_ID = str(row.get('Partner ID', ''))
                title = str(row.get('Title', ''))
                language = str(row.get('Language (Video Files)', ''))
                eidr = str(row.get('EIDR', ''))
                imdb = str(row.get('IMDb', ''))
                genre = str(row.get('Genre', ''))
                subgenre = str(row.get('Subgenre', ''))
                category = str(row.get('Category', ''))
                subcategory = str(row.get('Subcategory', ''))
                release_date = str(row.get('Release Date', ''))
                duration = str(row.get('Duration', ''))
                production_country = str(row.get('Production Country', ''))
                production_year = str(row.get('Production Year', ''))
                production_company = str(row.get('Production Company', ''))
                rating = str(row.get('Rating', ''))
                rating_descriptors = str(row.get('ratingDescriptors', ''))
                producers = remove_duplicate_names(str(row.get('Producers', '')))
                directors = remove_duplicate_names(str(row.get('Directors', '')))
                writers = remove_duplicate_names(str(row.get('Writers', '')))
                actors = remove_duplicate_names(str(row.get('Actors', '')))
                short_description = str(row.get('Short Description', ''))
                long_description = str(row.get('Long Description', ''))
                
                # Generate embedding for title
                title_response = bedrock_runtime.invoke_model(
                    modelId="cohere.embed-multilingual-v3",
                    body=json.dumps({
                        "input_type": "search_document",
                        "texts": [title],
                        "truncate": "NONE"
                    })
                )
                title_embedding = json.loads(title_response['body'].read()).get('embeddings', [])[0]

                # Generate embedding for actors
                actors_response = bedrock_runtime.invoke_model(
                    modelId="cohere.embed-multilingual-v3",
                    body=json.dumps({
                        "input_type": "search_document",
                        "texts": [actors],
                        "truncate": "NONE"
                    })
                )
                actors_embedding = json.loads(actors_response['body'].read()).get('embeddings', [])[0]

                # Generate embedding for producers
                producers_response = bedrock_runtime.invoke_model(
                    modelId="cohere.embed-multilingual-v3",
                    body=json.dumps({
                        "input_type": "search_document",
                        "texts": [producers],
                        "truncate": "NONE"
                    })
                )
                producers_embedding = json.loads(producers_response['body'].read()).get('embeddings', [])[0]

                # Generate embedding for directors
                directors_response = bedrock_runtime.invoke_model(
                    modelId="cohere.embed-multilingual-v3",
                    body=json.dumps({
                        "input_type": "search_document",
                        "texts": [directors],
                        "truncate": "NONE"
                    })
                )
                directors_embedding = json.loads(directors_response['body'].read()).get('embeddings', [])[0]

                # Generate embedding for writers
                writers_response = bedrock_runtime.invoke_model(
                    modelId="cohere.embed-multilingual-v3",
                    body=json.dumps({
                        "input_type": "search_document",
                        "texts": [writers],
                        "truncate": "NONE"
                    })
                )
                writers_embedding = json.loads(writers_response['body'].read()).get('embeddings', [])[0]

                # Generate embedding for description
                long_desc_response = bedrock_runtime.invoke_model(
                    modelId="cohere.embed-multilingual-v3",
                    body=json.dumps({
                        "input_type": "search_document",
                        "texts": [long_description],
                        "truncate": "NONE"
                    })
                )
                long_desc_embedding = json.loads(long_desc_response['body'].read()).get('embeddings', [])[0]
                
                # Prepare document for OpenSearch
                document = {
                    #embedding fields
                    "titleEmbedding": title_embedding,
                    "actorsEmbedding": actors_embedding,
                    "directorsEmbedding": directors_embedding,
                    "producersEmbedding": producers_embedding,
                    "writersEmbedding": writers_embedding,
                    "longDescriptionEmbedding": long_desc_embedding,

                    #other metadata fields
                    "mamUUID": mam_UUID,
                    "contentType": content_type,
                    "status": status,
                    "region": region,
                    "partner": partner,
                    "partnerID": partner_ID,
                    "title": title,
                    "language": language,
                    "eidr": eidr,
                    "imdb": imdb,
                    "genre": genre,
                    "subgenre": subgenre,
                    "category": category,
                    "subcategory": subcategory,
                    "releaseDate": release_date,
                    "duration": duration,
                    "productionCountry": production_country,
                    "productionYear": production_year,
                    "productionCompany": production_company,
                    "rating": rating,
                    "ratingDescriptors": rating_descriptors,
                    "producers": producers,
                    "directors": directors,
                    "writers": writers,
                    "actors": actors,
                    "shortDescription": short_description,
                    "longDescription": long_description,
                }
                
                # Post to OpenSearch
                response = client.index(
                    index = index_name,
                    body = document,
                )

                if response.get('result') in ['created']:
                    print(f"Successfully indexed document for row {index}")
                    successful_posts += 1
                # else:
                #     print(f"Failed to index document for row {index}: {response.text}")
                #     print(f"Document content: {document}")

                # Store the result in DynamoDB
                try:
                    titles_processing_queue_table = dynamodb_resource.Table(film_titles_processing_queue_table)
                    item = {
                        "mamUUID": mam_UUID,
                        "contentType": content_type,
                        "status": status,
                        "region": region,
                        "partner": partner,
                        "partnerID": partner_ID,
                        "title": title,
                        "language": language,
                        "eidr": eidr,
                        "imdb": imdb,
                        "genre": genre,
                        "subgenre": subgenre,
                        "category": category,
                        "subcategory": subcategory,
                        "releaseDate": release_date,
                        "duration": safe_int_conversion(duration),
                        "productionCountry": production_country,
                        "productionYear": safe_int_conversion(production_year),
                        "productionCompany": production_company,
                        "rating": rating,
                        "ratingDescriptors": rating_descriptors,
                        "producers": producers,
                        "directors": directors,
                        "writers": writers,
                        "actors": actors,
                        "shortDescription": short_description,
                        "longDescription": long_description,
                        # Format to ISO and replace +00:00 with "Z"
                        'createdAt': datetime.now(timezone.utc).isoformat(timespec='milliseconds').replace('+00:00', 'Z'),
                        'updatedAt': datetime.now(timezone.utc).isoformat(timespec='milliseconds').replace('+00:00', 'Z')
                    }

                    titles_processing_queue_table.put_item(Item=item)
                except Exception as db_error:
                    print(f"Error storing result in DynamoDB: {str(db_error)}")
                    return
            except Exception as e:
                print(f"Error processing row {index}: {e}")
                print(row)

        client.indices.refresh(index=index_name)
        print(f"Successfully indexed {successful_posts} out of {len(df)} documents to OpenSearch")        

        # Clean up temporary files
        os.remove(file_path)

        response = {
            "statusCode": 200,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "*"
            },
            "body": json.dumps({"message": "Success!"})
        }
        
        return response
        
    except Exception as e:
        error_message = f"Error: {str(e)}"
        print(error_message)
        return {
            'statusCode': 500,
            'error': str(e)
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

def safe_int_conversion(value):
    """
    Attempts to convert a value to an integer.
    Returns the integer if successful, None if the input is empty,
    or None if conversion fails for other reasons.
    """
    if isinstance(value, str) and not value.strip():  # Check for empty or whitespace-only strings
        return None
    try:
        return int(value)
    except (ValueError, TypeError):  # Catches errors for non-numeric strings or incompatible types
        return None