import json
import os
import boto3
from opensearchpy import OpenSearch, RequestsHttpConnection, AWSV4SignerAuth

def lambda_handler(event, context):
    try:
        body = json.loads(event['body']) if isinstance(event.get('body'), str) else event.get('body', {})
        user_id = body.get('userId', '')

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
        
        # Get indices with wildcard pattern for user suffix
        try:
            # Use wildcard to get indices ending with user_id
            pattern = f"*-{user_id}"
            indices_response = client.indices.get(index=pattern, ignore=[404])
            index_list = list(indices_response.keys()) if indices_response else []
        except Exception:
            # Fallback to getting all indices if wildcard fails
            indices_response = client.cat.indices(format='json', h='index')
            all_indices = [idx['index'] for idx in indices_response] if indices_response else []
            suffix = f"-{user_id}"
            index_list = [idx for idx in all_indices if idx.endswith(suffix)]
        
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
                'Access-Control-Allow-Methods': 'POST,OPTIONS',
                'Content-Type': 'application/json'
            },
            'body': json.dumps({
                'indexes': index_list
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