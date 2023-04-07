import { default as middyBase, MiddlewareObj } from '@middy/core';
import httpErrorHandler from '@middy/http-error-handler';
import { APIGatewayEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { ClassValidatorMiddleware } from 'middy-middleware-class-validator';
import JSONErrorHandlerMiddleware from 'middy-middleware-json-error-handler';

export type Class<T> = new (...args: any[]) => T;

class EmptyRequest {}

const jsonResponse: MiddlewareObj = {
  after: request => {
    request.response = {
      statusCode: 200,
      body: JSON.stringify(request.response)
    };
  }
};

const logger: MiddlewareObj = {
  before: b => {
    // @ts-ignore
    const { httpMethod, path, body } = b.event;
    console.info(`enter-${b.context.functionName}`, { url: `${httpMethod}:${path}`, body });
  },
  after: b => {
    // @ts-ignore
    const { httpMethod, path, body, response } = b.event;
    console.info(`exit-${b.context.functionName}`, { url: `${httpMethod}:${path}`, body, response });
  }
};

export type Body<T, B = {}> = Omit<T, 'body'> & {
  body: B;
};
type MiddyHandler<TEvent, TResult> = Parameters<typeof middyBase<TEvent, TResult>>[0];

export const middy = <T extends object, TEvent = Body<APIGatewayEvent, T>, TResult = any>(
  classType: Class<T>,
  handler: (x: { event: TEvent; context: Context }) => Promise<TResult>
) =>
  middyBase((event: TEvent, context: Context) => handler({ event, context }))
    .use(logger)
    .use(jsonResponse)
    .use(new ClassValidatorMiddleware({ classType }))
    .use(JSONErrorHandlerMiddleware());
