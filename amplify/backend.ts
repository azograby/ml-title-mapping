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
const s3Bucket = backend.storage.resources.bucket;

s3Bucket.addEventNotification(
  EventType.OBJECT_CREATED,
  new LambdaDestination(cfnIngestTitlesFunction),
  {
    prefix: 'assets/',
  }
);

const appPrefix = vars.APP_PREFIX;

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

// create a new Lambda integration
// const assetsLambdaIntegration = new LambdaIntegration(
//   backend.assetsProxyFunction.resources.lambda
// );

// create a new Cognito User Pools authorizer
// const cognitoAuth = new CognitoUserPoolsAuthorizer(apiStack, "CognitoAuth", {
//   cognitoUserPools: [backend.auth.resources.userPool],
// });

// create a new resource path with IAM authorization
// const assetsPath = restAPI.root.addResource("assets", {
//   defaultMethodOptions: {
//     authorizationType: AuthorizationType.NONE,
//   },
//   defaultCorsPreflightOptions: {
//     allowOrigins: ["*"],
//     allowMethods: Cors.ALL_METHODS,
//     allowHeaders: Cors.DEFAULT_HEADERS,
//   },
// });

// assetsPath.addMethod("GET", assetsLambdaIntegration, {
//   authorizationType: AuthorizationType.NONE
//     // authorizationType: AuthorizationType.COGNITO,
//     // authorizer: cognitoAuth,
//   });
// assetsPath.addMethod("POST", assetsLambdaIntegration, {
//   authorizationType: AuthorizationType.COGNITO,
//   authorizer: cognitoAuth,
// });
// assetsPath.addMethod("DELETE", assetsLambdaIntegration, {
//   authorizationType: AuthorizationType.COGNITO,
//   authorizer: cognitoAuth,
// });
// assetsPath.addMethod("PUT", assetsLambdaIntegration, {
//   authorizationType: AuthorizationType.COGNITO,
//   authorizer: cognitoAuth,
// });

// add a proxy resource path to the API
// assetsPath.addProxy({
//   anyMethod: true,
//   defaultIntegration: assetsLambdaIntegration,
//   defaultMethodOptions: {
//     authorizationType: AuthorizationType.NONE,
//       // authorizer: cognitoAuth,
//       requestParameters: {
//         "method.request.path.proxy": true,
//       },
//     },
//     defaultCorsPreflightOptions: {
//       allowOrigins: ["*"],
//       allowMethods: Cors.ALL_METHODS,
//       allowHeaders: Cors.DEFAULT_HEADERS,
//     },
// });

// create a new resource path with Cognito authorization
// const booksPath = restAPI.root.addResource("cognito-auth-path");
// booksPath.addMethod("GET", lambdaIntegration, {
//   authorizationType: AuthorizationType.COGNITO,
//   authorizer: cognitoAuth,
// });

// create a new IAM policy to allow Invoke access to the API
// const apiRestPolicy = new Policy(apiStack, "RestApiPolicy", {
//   statements: [
//     new PolicyStatement({
//       actions: ["execute-api:Invoke"],
//       resources: [
//         `${restAPI.arnForExecuteApi("*", "/assets", "dev")}`,
//         `${restAPI.arnForExecuteApi("*", "/assets/*", "dev")}`,
//         `${restAPI.arnForExecuteApi("*", "/cognito-auth-path", "dev")}`, // TODO: dynamically add env
//       ],
//     }),
//   ],
// });

// // attach the policy to the authenticated and unauthenticated IAM roles
// backend.auth.resources.authenticatedUserIamRole.attachInlinePolicy(
//   apiRestPolicy
// );
// backend.auth.resources.unauthenticatedUserIamRole.attachInlinePolicy(
//   apiRestPolicy
// );

// //async function, returns immediately and updates status to job status table
// const generateVideoAnalysisNovaLambdaIntegration = new LambdaIntegration(
//   backend.generateVideoAnalysisNovaFunction.resources.lambda,
//   {
//     requestParameters: {
//       "integration.request.header.X-Amz-Invocation-Type": "'Event'",
//     },
//     integrationResponses: [
//       {
//         statusCode: "200",
//         responseParameters: {
//           'method.response.header.Access-Control-Allow-Origin': "'*'",
//           'method.response.header.Access-Control-Allow-Headers': "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Amz-Invocation-Type'",
//           'method.response.header.Access-Control-Allow-Methods': "'OPTIONS,POST'",
//         },
//       },
//     ],
//     proxy: false,
//   }
// );

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

// const videoAnalysisClaudeHaikuPath = videoAnalysisPath.addResource("claude-haiku", {
//   defaultMethodOptions: {
//     authorizationType: AuthorizationType.NONE,
//   },
//   defaultCorsPreflightOptions: {
//     allowOrigins: ["*"],
//     allowMethods: Cors.ALL_METHODS,
//     allowHeaders: Cors.DEFAULT_HEADERS,
//   },
// });

// const generateVideoAnalysisPath = restAPI.root.addResource("generate-video-analysis", {
//   defaultMethodOptions: {
//     authorizationType: AuthorizationType.NONE,
//   },
//   defaultCorsPreflightOptions: {
//     allowOrigins: ["*"],
//     allowMethods: Cors.ALL_METHODS,
//     allowHeaders: 
//     [
//       ...Cors.DEFAULT_HEADERS,
//       'X-Amz-Invocation-Type'
//     ],
//   },
// });

// const generateVideoAnalysisNovaPath = generateVideoAnalysisPath.addResource("nova", {
//   defaultMethodOptions: {
//     authorizationType: AuthorizationType.NONE,
//   },
//   defaultCorsPreflightOptions: {
//     allowOrigins: ["*"],
//     allowMethods: Cors.ALL_METHODS,
//     allowHeaders: 
//     [
//       ...Cors.DEFAULT_HEADERS,
//       'X-Amz-Invocation-Type'
//     ],
//   },
// });

// const generateVideoAnalysisClaudeHaikuPath = generateVideoAnalysisPath.addResource("claude-haiku", {
//   defaultMethodOptions: {
//     authorizationType: AuthorizationType.NONE,
//   },
//   defaultCorsPreflightOptions: {
//     allowOrigins: ["*"],
//     allowMethods: Cors.ALL_METHODS,
//     allowHeaders: 
//     [
//       ...Cors.DEFAULT_HEADERS,
//       'X-Amz-Invocation-Type'
//     ],
//   },
// });

// // Add POST method for video analysis
// videoAnalysisNovaPath.addMethod("POST", analyzeVideoNovaLambdaIntegration, {
//   authorizationType: AuthorizationType.NONE
// });

// generateVideoAnalysisNovaPath.addMethod("POST", generateVideoAnalysisNovaLambdaIntegration, {
//   authorizationType: AuthorizationType.NONE,
//   methodResponses: [
//       {
//         statusCode: "200",
//         responseParameters: {
//           'method.response.header.Access-Control-Allow-Origin': true,
//           'method.response.header.Access-Control-Allow-Headers': true,
//           'method.response.header.Access-Control-Allow-Methods': true,
//         },
//       },
//     ],
// });

// videoAnalysisClaudeHaikuPath.addMethod("POST", analyzeVideoClaudeHaikuLambdaIntegration, {
//   authorizationType: AuthorizationType.NONE
// });

// generateVideoAnalysisClaudeHaikuPath.addMethod("POST", generateVideoAnalysisClaudeHaikuLambdaIntegration, {
//   authorizationType: AuthorizationType.NONE,
//   methodResponses: [
//       {
//         statusCode: "200",
//         responseParameters: {
//           'method.response.header.Access-Control-Allow-Origin': true,
//           'method.response.header.Access-Control-Allow-Headers': true,
//           'method.response.header.Access-Control-Allow-Methods': true,
//         },
//       },
//     ],
// });

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

// backend.analyzeVideoNovaFunction.resources.lambda.addToRolePolicy(bedrockPolicy);
// backend.analyzeVideoNovaFunction.resources.lambda.addToRolePolicy(s3Policy);
// backend.analyzeVideoNovaFunction.resources.lambda.addToRolePolicy(dynamoProcessingMessagesPolicy);
// backend.generateVideoAnalysisNovaFunction.resources.lambda.addToRolePolicy(bedrockPolicy);
// backend.generateVideoAnalysisNovaFunction.resources.lambda.addToRolePolicy(s3Policy);
// backend.generateVideoAnalysisNovaFunction.resources.lambda.addToRolePolicy(dynamoVideoAnalysisResultsPolicy);
// backend.generateVideoAnalysisNovaFunction.resources.lambda.addToRolePolicy(dynamoDeepProcessingApprovalsPolicy);
// backend.generateVideoAnalysisNovaFunction.resources.lambda.addToRolePolicy(dynamoJobStatusPolicy);
// cfnGenerateVideoAnalysisClaudeHaikuFunction.addToRolePolicy(bedrockPolicy);
// cfnGenerateVideoAnalysisClaudeHaikuFunction.addToRolePolicy(s3Policy);
// cfnGenerateVideoAnalysisClaudeHaikuFunction.addToRolePolicy(dynamoVideoAnalysisResultsPolicy);
// cfnGenerateVideoAnalysisClaudeHaikuFunction.addToRolePolicy(ssmPolicy);
// cfnGenerateVideoAnalysisClaudeHaikuFunction.addToRolePolicy(dynamoJobStatusPolicy);
// cfnGeneratePlaybackAssetsFunction.addToRolePolicy(s3Policy);
// cfnGeneratePlaybackAssetsFunction.addToRolePolicy(s3UploadPolicy);

cfnIngestTitlesFunction.addToRolePolicy(dynamoJobStatusPolicy);
cfnIngestTitlesFunction.addToRolePolicy(ssmPolicy);
cfnIngestTitlesFunction.addToRolePolicy(s3Policy);
cfnIngestTitlesFunction.addToRolePolicy(bedrockPolicy);

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