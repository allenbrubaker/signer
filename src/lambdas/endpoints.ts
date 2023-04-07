import { endpoints, HttpMethod } from '@core/api-gateway';

// Note: Endpoint definitions cannot be in the same file as the handler.

export const helloEndpoints = endpoints(__dirname, 'hello-lambdas', {
  handler: 'postHello',
  path: 'hello',
  method: HttpMethod.post
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
    path: Urls.startup,
    method: HttpMethod.post
  },
  {
    handler: 'startSign',
    path: Urls.startSign,
    method: HttpMethod.post
  },
  {
    handler: 'unsignedMessageIds',
    path: Urls.unsignedMessageIds,
    method: HttpMethod.get
  }
);
