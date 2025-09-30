import { Stack, StackProps, Duration, BundlingOptions, ILocalBundling } from 'aws-cdk-lib';
import { execSync } from "node:child_process";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { vars } from "../global-variables";
import outputs from "../../amplify_outputs.json";
import { parseAmplifyConfig } from "aws-amplify/utils";
import { CommonUtils } from '../utils';

const amplifyConfig = parseAmplifyConfig(outputs);
const assetBucketName = amplifyConfig.Storage?.S3?.buckets?.[vars.ASSET_S3_BUCKET_NAME].bucketName;

const functionDir = path.dirname(fileURLToPath(import.meta.url));

class LambdaPythonBundler implements ILocalBundling {
  private functionDir;
  private isCompiledPackage;
  constructor(functionDir: string, isCompiledPackage?: boolean) {
    this.functionDir = functionDir;
    this.isCompiledPackage = isCompiledPackage || false;
  }
  
  public tryBundle(outputDir: string, options: BundlingOptions) {

    execSync(`echo ${this.functionDir}`);

    try {
      execSync('pip3 --version');
    } catch {
      return false;
    }

    const commands = [
      `cd ${this.functionDir}`,
      // compiled package is necessary for packages that are compiled, such as numpy
      // see: https://docs.aws.amazon.com/lambda/latest/dg/python-layers.html and https://repost.aws/knowledge-center/lambda-python-package-compatible
      !this.isCompiledPackage ? `pip3 install -r requirements.txt -t ${outputDir}` 
      : `pip3 install -r requirements.txt --platform manylinux2014_x86_64 --only-binary=:all: -t ${outputDir}`,
      `cp -a . ${outputDir}`
    ];

    execSync(commands.join(' && '));
    return true;
  }
}

export class CustomLambdaStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    new lambda.Function(this, 'ingestItemsFunction', {
      runtime: lambda.Runtime.PYTHON_3_9,
      handler: 'index.lambda_handler',
      functionName: CommonUtils.getUniqueResourceNameForEnv('ingest-items'),
      description: 'Ingest items into OpenSearch and add items to DynamoDB processing table',
      timeout: Duration.seconds(900),
      memorySize: 256,
      environment: {
        "ASSET_BUCKET_NAME": assetBucketName || '',
        "AWS_BRANCH": process.env.AWS_BRANCH || '',
      },
      code: lambda.Code.fromAsset(functionDir, {
        bundling: {
          image: lambda.Runtime.PYTHON_3_9.bundlingImage, // this is just a fallback, the build process must support Docker if you decide to use this
          local: new LambdaPythonBundler(`${functionDir}/ingestItems`, true) // functionDir is the root of custom-functions. Must specify lambda folder here
        },
      }),
    });

    new lambda.Function(this, 'findRelatedItemsFunction', {
      runtime: lambda.Runtime.PYTHON_3_9,
      handler: 'index.lambda_handler',
      functionName: CommonUtils.getUniqueResourceNameForEnv('find-related-items'),
      description: 'Receives item metadata for a single item, and returns related items by searching Amazon OpenSearch',
      timeout: Duration.seconds(900),
      memorySize: 256,
      environment: {
        "ASSET_BUCKET_NAME": assetBucketName || '',
        "AWS_BRANCH": process.env.AWS_BRANCH || '',
      },
      code: lambda.Code.fromAsset(functionDir, {
        bundling: {
          image: lambda.Runtime.PYTHON_3_9.bundlingImage, // this is just a fallback, the build process must support Docker if you decide to use this
          local: new LambdaPythonBundler(`${functionDir}/findRelatedItems`, true) // functionDir is the root of custom-functions. Must specify lambda folder here
        },
      }),
    });

    new lambda.Function(this, 'createIndexFunction', {
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: 'index.lambda_handler',
      functionName: CommonUtils.getUniqueResourceNameForEnv('create-index'),
      description: 'Create OpenSearch index based on field configuration from create-index page',
      timeout: Duration.seconds(300),
      memorySize: 256,
      environment: {
        "AWS_BRANCH": process.env.AWS_BRANCH || '',
      },
      code: lambda.Code.fromAsset(functionDir, {
        bundling: {
          image: lambda.Runtime.PYTHON_3_12.bundlingImage,
          local: new LambdaPythonBundler(`${functionDir}/createIndex`, false)
        },
      }),
    });

    new lambda.Function(this, 'getAllIndexesFunction', {
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: 'index.lambda_handler',
      functionName: CommonUtils.getUniqueResourceNameForEnv('get-all-indexes'),
      description: 'Get all indexes from OpenSearch collection',
      timeout: Duration.seconds(300),
      memorySize: 256,
      environment: {
        "AWS_BRANCH": process.env.AWS_BRANCH || '',
      },
      code: lambda.Code.fromAsset(functionDir, {
        bundling: {
          image: lambda.Runtime.PYTHON_3_12.bundlingImage,
          local: new LambdaPythonBundler(`${functionDir}/getAllIndexes`, false)
        },
      }),
    });
  };
}