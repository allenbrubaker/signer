import type { AWS } from '@serverless/typescript';
import { helloEndpoints, lambdaEndpoints } from '@lambdas/*';
import { Lift } from 'serverless-lift';

const serverlessConfiguration: AWS & Lift = {
  useDotenv: true,
  service: 'signer21',
  frameworkVersion: '3',
  plugins: ['serverless-esbuild', 'serverless-localstack', 'serverless-dotenv-plugin', 'serverless-lift'],
  provider: {
    name: 'aws',
    runtime: 'nodejs18.x',
    apiGateway: {
      minimumCompressionSize: 1024,
      shouldStartNameWithService: true
    },
    environment: {
      AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
      NODE_OPTIONS: '--enable-source-maps --stack-trace-limit=1000'
    }
  },
  // constructs: {
  //   'start-sign-queue': {
  //     type: 'queue',
  //     batchSize: 1,
  //     worker: {
  //       handler: 'src/lambdas/lambdas.sign'
  //     }
  //   }
  // },
  // @ts-ignore
  functions: { ...helloEndpoints, ...lambdaEndpoints },
  package: { individually: true },
  custom: {
    esbuild: {
      bundle: true,
      minify: false,
      sourcemap: true,
      exclude: ['aws-sdk'],
      target: 'node18',
      define: { 'require.resolve': undefined },
      platform: 'node',
      concurrency: 10
    },
    localstack: {
      stages: ['local'],
      mountCode: true,
    }
  }
};

module.exports = serverlessConfiguration;
