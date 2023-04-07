import type { APIGatewayProxyEvent, APIGatewayProxyResult, Handler } from 'aws-lambda';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

type ValidatedAPIGatewayProxyEvent<S extends JSONSchema> = Omit<APIGatewayProxyEvent, 'body'> & { body: FromSchema<S> };
export type ValidatedEventAPIGatewayProxyEvent<S extends JSONSchema> = Handler<
  ValidatedAPIGatewayProxyEvent<S>,
  APIGatewayProxyResult
>;

export const formatJSONResponse = (response: Record<string, unknown>) => {
  return {
    statusCode: 200,
    body: JSON.stringify(response)
  };
};

const handlerPath = (context: string) => {
  return `${context.split(process.cwd())[1].substring(1).replace(/\\/g, '/')}`;
};

export enum HttpMethod {
  get = 'get',
  post = 'post',
  put = 'put',
  patch = 'patch',
  delete = 'delete'
}

type Parms = {
  handler: string;
  method: HttpMethod;
  path: string;
};

export const endpoints = (dirname: string, controller: string, ...parms: Parms[]) =>
  parms.reduce<Record<string, unknown>>((acc, { handler, method, path }) => {
    acc[handler] = {
      handler: `${handlerPath(dirname)}/${controller}.${handler}`,
      events: [
        {
          http: {
            method: method.toUpperCase(),
            path
          }
        }
      ]
    };
    return acc;
  }, {});
