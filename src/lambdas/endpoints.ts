import { endpoints, HttpMethod } from '@core/api-gateway';

// Note: Endpoint definitions cannot be in the same file as the handler.

export const helloEndpoints = endpoints(__dirname, 'hello-lambdas', {
  handler: 'postHello',
  method: HttpMethod.post,
  path: 'hello'
});

export enum Urls {
  unsignedMessageIds = 'unsigned-message-ids',
  startup = 'startup',
  startSign = 'run'
}

export const lambdaEndpoints = endpoints(
  __dirname,
  'lambdas',
  {
    handler: 'startup',
    method: HttpMethod.post,
    path: Urls.startup
  },
  {
    handler: 'startSign',
    method: HttpMethod.post,
    path: Urls.startSign
  }
);
