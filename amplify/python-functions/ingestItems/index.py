import os
import pandas as pd
import boto3
import json
import urllib.parse
import tempfile
import uuid
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
processing_queue_table_name = params.get('PROCESSING_QUEUE_TABLE')
index_config_table = params.get('INDEX_CONFIG_TABLE')

def get_index_config(index_name):
    """Get index configuration from DynamoDB"""
    try:
        table = dynamodb_resource.Table(index_config_table)
        response = table.get_item(Key={'indexName': index_name})
        if 'Item' in response:
            return response['Item']
        return None
    except Exception as e:
        print(f"Error getting index config: {e}")
        return None

def to_camel_case(snake_str):
    """Convert snake_case to camelCase"""
    components = snake_str.replace('_', ' ').split(' ')
    components = [comp for comp in components if comp]
    if not components:
        return snake_str.lower()
    return components[0].lower() + ''.join(word.capitalize() for word in components[1:])

def lambda_handler(event, context):
    """    
    This function:
    1. Processes the event when a file is uploaded to S3
    2. Reads the excel file contents
    3. Indexes the items into OpenSearch based on index configuration
    4. Adds the items to the processing queue DynamoDB table
    
    Parameters:
    - event: Lambda event containing S3 event
    - context: Lambda context
    
    """
    try:
        print(f"event: {event['Records'][0]}")
        
        bucket = event['Records'][0]['s3']['bucket']['name']
        file_key = urllib.parse.unquote_plus(event['Records'][0]['s3']['object']['key'], encoding='utf-8')
        
        # Extract indexName from file path (e.g., assets/identityId/indexName/unique-file-name.xlsx -> indexName)
        path_parts = file_key.split('/')
        index_name = path_parts[2]  # assets/identityId/indexName/unique-file-name.xlsx

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

        # Get index configuration from DynamoDB
        index_config = get_index_config(index_name)
        vector_fields = index_config.get('vectorFieldList', []) if index_config else []
        exact_fields = index_config.get('exactFieldList', []) if index_config else []
        
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
            df = pd.read_excel(file_path, na_filter = False)
            print(f"Successfully loaded file")
        except Exception as e:
            print(f"Error loading file: {e}")
            return
        
        # Process each row
        successful_posts = 0
        for index, row in df.iterrows():
            try:
                document = {}
                
                # Process each column dynamically
                for column in df.columns:
                    raw_value = row.get(column, '')
                    camel_field = to_camel_case(column)
                    
                    # Apply special processing for certain fields
                    if column.lower() in ['producers', 'directors', 'writers', 'actors']:
                        field_value = remove_duplicate_names(str(raw_value))
                    elif is_numeric_value(raw_value):
                        field_value = safe_int_conversion(raw_value)
                    else:
                        field_value = str(raw_value)
                    
                    # Check if field is in vector configuration
                    if column in vector_fields:
                        # Generate embedding
                        response = bedrock_runtime.invoke_model(
                            modelId="cohere.embed-multilingual-v3",
                            body=json.dumps({
                                "input_type": "search_document",
                                "texts": [field_value],
                                "truncate": "NONE"
                            })
                        )
                        embedding = json.loads(response['body'].read()).get('embeddings', [])[0]
                        
                        document[f"{camel_field}Embedding"] = embedding
                        document[camel_field] = field_value
                    
                    # Check if field is in exact configuration
                    # elif column in exact_fields:
                    #     document[camel_field] = field_value
                    # all other fields (even if not used), will be keyword fields
                    else:
                        document[camel_field] = field_value
                
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
                    processing_queue_table = dynamodb_resource.Table(processing_queue_table_name)
                    item = {}
                    
                    # Build DynamoDB item dynamically from row data
                    for column in df.columns:
                        raw_value = row.get(column, '')
                        camel_field = to_camel_case(column)
                        
                        if column.lower() in ['producers', 'directors', 'writers', 'actors']:
                            item[camel_field] = remove_duplicate_names(str(raw_value))
                        elif is_numeric_value(raw_value):
                            item[camel_field] = safe_int_conversion(raw_value)
                        else:
                            item[camel_field] = str(raw_value)
                    
                    # Add unique ID and timestamps
                    item['indexName'] = index_name
                    item['id'] = str(uuid.uuid4())
                    item['createdAt'] = datetime.now(timezone.utc).isoformat(timespec='milliseconds').replace('+00:00', 'Z')
                    item['updatedAt'] = datetime.now(timezone.utc).isoformat(timespec='milliseconds').replace('+00:00', 'Z')

                    processing_queue_table.put_item(Item=item)
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

def is_numeric_value(value):
    """Check if a value can be converted to an integer"""
    try:
        int(value)
        return True
    except (ValueError, TypeError):
        return False