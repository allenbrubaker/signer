import { endpoints, HttpMethod } from '@core/api-gateway';

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
  }
);
