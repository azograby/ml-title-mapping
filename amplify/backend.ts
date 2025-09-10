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
// cfnAnalyzeVideoFunction.addEnvironment('LOG_OUTPUT_TABLE', backend.data.resources.tables["LogOutput"].tableName);
// cfnAnalyzeVideoFunction.addEnvironment('ANALYSIS_RESULTS_TABLE', backend.data.resources.tables["VideoAnalysisResults"].tableName);
new aws_ssm.StringParameter(backend.stack, 'LogOutputTableParam', {
  parameterName: `/${process.env.AWS_BRANCH}/LOG_OUTPUT_TABLE`,
  stringValue: backend.data.resources.tables["LogOutput"].tableName
});

new aws_ssm.StringParameter(backend.stack, 'FilmTitlesProcessingQueueTableParam', {
  parameterName: `/${process.env.AWS_BRANCH}/FILM_TITLES_PROCESSING_QUEUE_TABLE`,
  stringValue: backend.data.resources.tables["FilmTitlesProcessingQueue"].tableName
});

const cfnIngestTitlesFunction = customFunctionsStack.node.findChild('ingestTitlesFunction') as lambda.Function;
const cfnFindRelatedTitlesFunction = customFunctionsStack.node.findChild('findRelatedTitlesFunction') as lambda.Function;

const appPrefix = vars.APP_PREFIX;

// OpenSearch Serverless collection
const networkPolicy = new opensearchserverless.CfnSecurityPolicy(backend.stack, 'NetworkPolicy', {
  name: 'title-collection-network-policy',
  type: 'network',
  policy: JSON.stringify([{
    "Rules": [{
      "Resource": ["collection/title-collection"],
      "ResourceType": "dashboard"
    }, {
      "Resource": ["collection/title-collection"],
      "ResourceType": "collection"
    }],
    "AllowFromPublic": true
  }])
});

const dataAccessPolicy = new opensearchserverless.CfnAccessPolicy(backend.stack, 'DataAccessPolicy', {
  name: 'title-collection-data-policy',
  type: 'data',
  policy: JSON.stringify([{
    "Rules": [{
      "Resource": ["collection/title-collection"],
      "Permission": ["aoss:CreateCollectionItems", "aoss:DeleteCollectionItems", "aoss:UpdateCollectionItems", "aoss:DescribeCollectionItems", "aoss:*"],
      "ResourceType": "collection"
    }, {
      "Resource": ["index/title-collection/*"],
      "Permission": ["aoss:CreateIndex", "aoss:DeleteIndex", "aoss:UpdateIndex", "aoss:DescribeIndex", "aoss:ReadDocument", "aoss:WriteDocument", "aoss:*"],
      "ResourceType": "index"
    }],
    "Principal": [cfnIngestTitlesFunction.functionArn, cfnFindRelatedTitlesFunction.functionArn],
    "Description": "Rule 1"
  }])
});

const titleCollection = new opensearchserverless.CfnCollection(backend.stack, 'TitleCollection', {
  name: 'title-collection',
  type: 'VECTORSEARCH'
});

titleCollection.addDependency(networkPolicy);
titleCollection.addDependency(dataAccessPolicy);

new aws_ssm.StringParameter(backend.stack, 'OpenSearchEndpointParam', {
  parameterName: `/${process.env.AWS_BRANCH}/OPENSEARCH_ENDPOINT`,
  stringValue: titleCollection.attrCollectionEndpoint
});

const s3Bucket = backend.storage.resources.bucket;

s3Bucket.addEventNotification(
  EventType.OBJECT_CREATED,
  new LambdaDestination(cfnIngestTitlesFunction),
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

const relatedTitlesPath = restAPI.root.addResource("related-titles", {
  defaultMethodOptions: {
    authorizationType: AuthorizationType.NONE,
  },
  defaultCorsPreflightOptions: {
    allowOrigins: ["*"],
    allowMethods: Cors.ALL_METHODS,
    allowHeaders: Cors.DEFAULT_HEADERS,
  },
});

const relatedTitlesLambdaIntegration = new LambdaIntegration(
  cfnFindRelatedTitlesFunction
);

relatedTitlesPath.addMethod("POST", relatedTitlesLambdaIntegration, {
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
  actions: ["ssm:GetParametersByPath"],
  resources: ["*"], // You might want to restrict this to specific model ARNs in production
});

const opensearchPolicy = new PolicyStatement({
  actions: ["aoss:APIAccessAll", "aoss:DashboardsAccessAll"],
  resources: ["*"], // You might want to restrict this to specific model ARNs in production
});

cfnIngestTitlesFunction.addToRolePolicy(dynamoJobStatusPolicy);
cfnIngestTitlesFunction.addToRolePolicy(ssmPolicy);
cfnIngestTitlesFunction.addToRolePolicy(s3Policy);
cfnIngestTitlesFunction.addToRolePolicy(bedrockPolicy);
cfnIngestTitlesFunction.addToRolePolicy(opensearchPolicy);

cfnFindRelatedTitlesFunction.addToRolePolicy(dynamoJobStatusPolicy);
cfnFindRelatedTitlesFunction.addToRolePolicy(ssmPolicy);
cfnFindRelatedTitlesFunction.addToRolePolicy(s3Policy);
cfnFindRelatedTitlesFunction.addToRolePolicy(bedrockPolicy);
cfnFindRelatedTitlesFunction.addToRolePolicy(opensearchPolicy);

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
  },
});