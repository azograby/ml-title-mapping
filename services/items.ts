import { vars } from '../amplify/global-variables';
import { post } from 'aws-amplify/api';
import outputs from "../amplify_outputs.json";
import { CommonUtils } from '@/amplify/utils';
import { IFindRelatedItemsRequest, IFindRelatedItemsResponse } from '@/types/items';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../amplify/data/resource';
import { IItem } from "../types/items";
import { DynamoDBClient, QueryCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { fetchAuthSession } from 'aws-amplify/auth';

export class ItemsService {
  private static client = generateClient<Schema>();

  static async getItemsByIndex(indexName: string, limit: number): Promise<any[]> {
    try {
      const session = await fetchAuthSession();
      const dynamoClient = new DynamoDBClient({
        region: outputs.auth.aws_region,
        credentials: session.credentials
      });

      const tableName = outputs.custom.tables.ProcessingQueue;

      const command = new QueryCommand({
        TableName: tableName,
        KeyConditionExpression: 'indexName = :indexName',
        ExpressionAttributeValues: marshall({ ':indexName': indexName }),
        Limit: limit
      });

      const result = await dynamoClient.send(command);
      return result.Items?.map(item => unmarshall(item)) || [];
    } catch (error) {
      console.error('Error listing items:', error);
      throw error;
    }
  }
    
    static async findRelatedItems(request: IFindRelatedItemsRequest): Promise<IFindRelatedItemsResponse> {
    try {
      const {body} = await post({
        apiName: outputs.custom.apiName,
        path: vars.API_PATHS.FIND_RELATED_ITEMS,
        options: {
          //@ts-ignore
          body: request
        }
      }).response;

      const response = await body.json();
      const result: IFindRelatedItemsResponse = {
        //@ts-ignore
        items: response._items,
        //@ts-ignore
        totalResults: response._totalResults,
        //@ts-ignore
        maxScore: response._maxScore
      };

      console.log(response);
      return result;
    } catch (error) {
      // Make sure lambda functions return "error" object in case of failure
      //@ts-ignore
      const message = CommonUtils.tryGetErrorFromBackend(error);
      if(message) {
        console.error(message);
        throw new Error(message);
      } else {
        console.log(error);
        throw new Error('Response failed: ' + error);
      }
    }
  }
}