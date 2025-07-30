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
        print(f"request_data: {event['Records'][0]}")

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
                producers = str(row.get('Producers', ''))
                directors = str(row.get('Directors', ''))
                writers = str(row.get('Writers', ''))
                actors = str(row.get('Actors', ''))
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

                # Generate embedding for film type
                film_type = f"{genre}-{subgenre}-{category}-{subcategory}"
                film_type_response = bedrock_runtime.invoke_model(
                    modelId="cohere.embed-multilingual-v3",
                    body=json.dumps({
                        "input_type": "search_document",
                        "texts": [film_type],
                        "truncate": "NONE"
                    })
                )
                film_type_embedding = json.loads(film_type_response['body'].read()).get('embeddings', [])[0]

                # Generate embedding for release date
                release_date_response = bedrock_runtime.invoke_model(
                    modelId="cohere.embed-multilingual-v3",
                    body=json.dumps({
                        "input_type": "search_document",
                        "texts": [release_date],
                        "truncate": "NONE"
                    })
                )
                release_date_embedding = json.loads(release_date_response['body'].read()).get('embeddings', [])[0]
                
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
                    "title-embedding": title_embedding,
                    "film-type-embedding": film_type_embedding,
                    "release-date-embedding": release_date_embedding,
                    "long-description-embedding": long_desc_embedding,

                    #other metadata fields
                    "mam-uuid": mam_UUID,
                    "content-type": content_type,
                    "status": status,
                    "region": region,
                    "partner": partner,
                    "partner-ID": partner_ID,
                    "title": title,
                    "language": language,
                    "eidr": eidr,
                    "imdb": imdb,
                    "genre": genre,
                    "subgenre": subgenre,
                    "category": category,
                    "subcategory": subcategory,
                    "release-date": release_date,
                    "duration": duration,
                    "production-country": production_country,
                    "production-year": production_year,
                    "production-company": production_company,
                    "rating": rating,
                    "rating-descriptors": rating_descriptors,
                    "producers": producers,
                    "directors": directors,
                    "writers": writers,
                    "actors": actors,
                    "short-description": short_description,
                    "long-description": long_description,
                }
                
                # Post to OpenSearch
                # response = client.index(
                #     index = 'films',
                #     body = document,
                # )

                # if response.get('result') in ['created']:
                #     print(f"Successfully indexed document for row {index}")
                #     successful_posts += 1
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