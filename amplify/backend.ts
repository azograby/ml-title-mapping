import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource.js';
import { data } from './data/resource.js';
import { storage } from './storage/resource.js';
import { Stack, aws_ssm } from "aws-cdk-lib";
import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { AnyPrincipal } from 'aws-cdk-lib/aws-iam';
import { EventType } from 'aws-cdk-lib/aws-s3';
import { LambdaDestination } from 'aws-cdk-lib/aws-s3-notifications';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as lambdaEventSources from 'aws-cdk-lib/aws-lambda-event-sources';
import * as opensearchserverless from 'aws-cdk-lib/aws-opensearchserverless';
import { CommonUtils } from './utils';

import {
  AuthorizationType,
  CognitoUserPoolsAuthorizer,
  Cors,
  LambdaIntegration,
  RestApi,
} from "aws-cdk-lib/aws-apigateway";
import { Policy, PolicyStatement } from "aws-cdk-lib/aws-iam";
import { vars } from './global-variables.js';
import {CustomLambdaStack} from './python-functions/resources';

const backend = defineBackend({
  auth,
  data,
  storage
});

//lambda functions that are custom (ie, python)
export const customFunctionsStack = new CustomLambdaStack(
  backend.createStack(vars.APP_PREFIX + "-custom-functions-stack"),
  vars.APP_PREFIX + "-custom-functions-stack",
);

// set parameter store value for dynamo tables, adding env vars like below will result in a cyclic dependency
// cfnAnalyzeVideoFunction.addEnvironment('ANALYSIS_RESULTS_TABLE', backend.data.resources.tables["VideoAnalysisResults"].tableName);

new aws_ssm.StringParameter(backend.stack, 'ProcessingQueueTableParam', {
  parameterName: `/${process.env.AWS_BRANCH}/PROCESSING_QUEUE_TABLE`,
  stringValue: backend.data.resources.tables["ProcessingQueue"].tableName
});

new aws_ssm.StringParameter(backend.stack, 'IndexConfigTableParam', {
  parameterName: `/${process.env.AWS_BRANCH}/INDEX_CONFIG_TABLE`,
  stringValue: backend.data.resources.tables["IndexConfig"].tableName
});

const cfnIngestItemsFunction = customFunctionsStack.node.findChild('ingestItemsFunction') as lambda.Function;
const cfnFindRelatedItemsFunction = customFunctionsStack.node.findChild('findRelatedItemsFunction') as lambda.Function;
const cfnCreateIndexFunction = customFunctionsStack.node.findChild('createIndexFunction') as lambda.Function;
const cfnGetAllIndexesFunction = customFunctionsStack.node.findChild('getAllIndexesFunction') as lambda.Function;

const appPrefix = vars.APP_PREFIX;

// OpenSearch Serverless collection
const encryptionPolicy = new opensearchserverless.CfnSecurityPolicy(backend.stack, 'EncryptionPolicy', {
  name: 'item-collection-encrypt-policy',
  type: 'encryption',
  policy: JSON.stringify({
    "Rules": [{
      "ResourceType": "collection",
      "Resource": ["collection/item-collection"]
    }],
    "AWSOwnedKey": true
  })
});

const networkPolicy = new opensearchserverless.CfnSecurityPolicy(backend.stack, 'NetworkPolicy', {
  name: 'item-collection-network-policy',
  type: 'network',
  policy: JSON.stringify([{
    "Rules": [{
      "Resource": ["collection/item-collection"],
      "ResourceType": "dashboard"
    }, {
      "Resource": ["collection/item-collection"],
      "ResourceType": "collection"
    }],
    "AllowFromPublic": true
  }])
});

const dataAccessPolicy = new opensearchserverless.CfnAccessPolicy(backend.stack, 'DataAccessPolicy', {
  name: 'item-collection-data-policy',
  type: 'data',
  policy: JSON.stringify([{
    "Rules": [{
      "Resource": ["collection/item-collection"],
      "Permission": ["aoss:CreateCollectionItems", "aoss:DeleteCollectionItems", "aoss:UpdateCollectionItems", "aoss:DescribeCollectionItems", "aoss:*"],
      "ResourceType": "collection"
    }, {
      "Resource": ["index/item-collection/*"],
      "Permission": ["aoss:CreateIndex", "aoss:DeleteIndex", "aoss:UpdateIndex", "aoss:DescribeIndex", "aoss:ReadDocument", "aoss:WriteDocument", "aoss:*"],
      "ResourceType": "index"
    }],
    "Principal": [cfnIngestItemsFunction.role!.roleArn, cfnFindRelatedItemsFunction.role!.roleArn, cfnCreateIndexFunction.role!.roleArn, cfnGetAllIndexesFunction.role!.roleArn],
    "Description": "Rule 1"
  }])
});

const itemCollection = new opensearchserverless.CfnCollection(backend.stack, 'ItemCollection', {
  name: 'item-collection',
  type: 'VECTORSEARCH'
});

itemCollection.addDependency(encryptionPolicy);
itemCollection.addDependency(networkPolicy);
itemCollection.addDependency(dataAccessPolicy);

new aws_ssm.StringParameter(backend.stack, 'OpenSearchEndpointParam', {
  parameterName: `/${process.env.AWS_BRANCH}/OPENSEARCH_ENDPOINT`,
  stringValue: itemCollection.attrCollectionEndpoint
});

const s3Bucket = backend.storage.resources.bucket;

s3Bucket.addEventNotification(
  EventType.OBJECT_CREATED,
  new LambdaDestination(cfnIngestItemsFunction),
  {
    prefix: 'assets/',
  }
);

// TODO: add cognito auth later, right now the api doesn't use auth
const apiStack = backend.createStack(appPrefix + "-api-stack");

const restAPI = new RestApi(apiStack, "RestApi", {
  restApiName: `${appPrefix}-rest-api-${process.env.AWS_BRANCH}`,
  deploy: true,
  deployOptions: {
    stageName: process.env.AWS_BRANCH,
  },
  defaultCorsPreflightOptions: {
    allowOrigins: ["*"], //['*.amplifyapp.com', 'http://localhost:3000'], // Restrict this to domains you trust
    allowMethods: Cors.ALL_METHODS, // Specify only the methods you need to allow
    allowHeaders: Cors.DEFAULT_HEADERS, // Specify only the headers you need to allow
  },
});

const assetsPath = restAPI.root.addResource('assets', {
  defaultMethodOptions: {
    authorizationType: AuthorizationType.NONE,
  },
  defaultCorsPreflightOptions: {
    allowOrigins: ["*"],
    allowMethods: Cors.ALL_METHODS,
    allowHeaders: Cors.DEFAULT_HEADERS,
  },
});

const relatedItemsPath = restAPI.root.addResource("related-items", {
  defaultMethodOptions: {
    authorizationType: AuthorizationType.NONE,
  },
  defaultCorsPreflightOptions: {
    allowOrigins: ["*"],
    allowMethods: Cors.ALL_METHODS,
    allowHeaders: Cors.DEFAULT_HEADERS,
  },
});

const relatedItemsLambdaIntegration = new LambdaIntegration(
  cfnFindRelatedItemsFunction
);

relatedItemsPath.addMethod("POST", relatedItemsLambdaIntegration, {
  authorizationType: AuthorizationType.NONE,
});

const createIndexPath = restAPI.root.addResource("create-index", {
  defaultMethodOptions: {
    authorizationType: AuthorizationType.NONE,
  },
  defaultCorsPreflightOptions: {
    allowOrigins: ["*"],
    allowMethods: Cors.ALL_METHODS,
    allowHeaders: Cors.DEFAULT_HEADERS,
  },
});

const createIndexLambdaIntegration = new LambdaIntegration(
  cfnCreateIndexFunction
);

createIndexPath.addMethod("POST", createIndexLambdaIntegration, {
  authorizationType: AuthorizationType.NONE,
});

const getAllIndexesPath = restAPI.root.addResource("get-all-indexes", {
  defaultMethodOptions: {
    authorizationType: AuthorizationType.NONE,
  },
  defaultCorsPreflightOptions: {
    allowOrigins: ["*"],
    allowMethods: Cors.ALL_METHODS,
    allowHeaders: Cors.DEFAULT_HEADERS,
  },
});

const getAllIndexesLambdaIntegration = new LambdaIntegration(
  cfnGetAllIndexesFunction
);

getAllIndexesPath.addMethod("POST", getAllIndexesLambdaIntegration, {
  authorizationType: AuthorizationType.NONE,
});

// Add IAM permissions for Bedrock
const bedrockPolicy = new PolicyStatement({
  actions: ["bedrock:InvokeModel", "bedrock:InvokeModelWithResponseStream"],
  resources: ["*"], // You might want to restrict this to specific model ARNs in production
});

const s3Policy = new PolicyStatement({
  actions: ["s3:Get*", "s3:List*"],
  resources: ["*"], // You might want to restrict this to specific model ARNs in production
});

const s3UploadPolicy = new PolicyStatement({
  actions: ["s3:Put*"],
  resources: ["*"], // You might want to restrict this to specific model ARNs in production
});

const dynamoProcessingMessagesPolicy = new PolicyStatement({
  actions: ["dynamodb:PutItem"],
  resources: ["*"], // You might want to restrict this to specific model ARNs in production
});

const dynamoVideoAnalysisResultsPolicy = new PolicyStatement({
  actions: ["dynamodb:PutItem"],
  resources: ["*"], // You might want to restrict this to specific model ARNs in production
});

const dynamoDeepProcessingApprovalsPolicy = new PolicyStatement({
  actions: ["dynamodb:PutItem", "dynamodb:DeleteItem"],
  resources: ["*"], // You might want to restrict this to specific model ARNs in production
});

const dynamoJobStatusPolicy = new PolicyStatement({
  actions: ["dynamodb:PutItem", "dynamodb:DeleteItem", "dynamodb:UpdateItem", "dynamodb:Query"],
  resources: ["*"], // You might want to restrict this to specific model ARNs in production
});

const ssmPolicy = new PolicyStatement({
  actions: ["ssm:GetParametersByPath", "ssm:GetParameter"],
  resources: ["*"], // You might want to restrict this to specific model ARNs in production
});

const opensearchPolicy = new PolicyStatement({
  actions: ["aoss:APIAccessAll", "aoss:DashboardsAccessAll"],
  resources: ["*"], // You might want to restrict this to specific model ARNs in production
});

cfnIngestItemsFunction.addToRolePolicy(dynamoJobStatusPolicy);
cfnIngestItemsFunction.addToRolePolicy(ssmPolicy);
cfnIngestItemsFunction.addToRolePolicy(s3Policy);
cfnIngestItemsFunction.addToRolePolicy(bedrockPolicy);
cfnIngestItemsFunction.addToRolePolicy(opensearchPolicy);

const dynamoIndexConfigPolicy = new PolicyStatement({
  actions: ["dynamodb:GetItem"],
  resources: ["*"],
});

cfnIngestItemsFunction.addToRolePolicy(dynamoIndexConfigPolicy);

cfnFindRelatedItemsFunction.addToRolePolicy(dynamoJobStatusPolicy);
cfnFindRelatedItemsFunction.addToRolePolicy(ssmPolicy);
cfnFindRelatedItemsFunction.addToRolePolicy(s3Policy);
cfnFindRelatedItemsFunction.addToRolePolicy(bedrockPolicy);
cfnFindRelatedItemsFunction.addToRolePolicy(opensearchPolicy);

cfnCreateIndexFunction.addToRolePolicy(opensearchPolicy);
cfnCreateIndexFunction.addToRolePolicy(ssmPolicy);
cfnCreateIndexFunction.addToRolePolicy(dynamoJobStatusPolicy);

cfnGetAllIndexesFunction.addToRolePolicy(opensearchPolicy);
cfnGetAllIndexesFunction.addToRolePolicy(ssmPolicy);

// Add DynamoDB permissions to authenticated users for direct table access
backend.auth.resources.authenticatedUserIamRole.addToPrincipalPolicy(
  new PolicyStatement({
    actions: [
      "dynamodb:Query",
      "dynamodb:GetItem",
      "dynamodb:BatchGetItem",
      "dynamodb:Scan"
    ],
    resources: [
      "*"
    ]
  })
);

// add outputs to the configuration file
backend.addOutput({
  custom: {
    region: cdk.Aws.REGION,
    apiName: restAPI.restApiName,
    API: {
      [restAPI.restApiName]: {
        endpoint: restAPI.url,
        region: Stack.of(restAPI).region,
        apiName: restAPI.restApiName,
      },
    },
    tables: {
      ProcessingQueue: backend.data.resources.tables["ProcessingQueue"].tableName,
      IndexConfig: backend.data.resources.tables["IndexConfig"].tableName,
    },
  },
});