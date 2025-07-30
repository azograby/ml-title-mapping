import os
import boto3
import json

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
film_titles_processing_queue_table = params.get('FILM_TITLES_PROCESSING_QUEUE_TABLE')

def handler(event, context):
    try:
        limit = int(event.get('limit', 10))
        
        table = dynamodb.Table(film_titles_processing_queue_table)
        response = table.scan(Limit=limit)
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'items': response['Items'],
                'count': len(response['Items'])
            })
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }