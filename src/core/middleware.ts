import { default as middyBase, MiddlewareObj } from '@middy/core';
import httpErrorHandler from '@middy/http-error-handler';
import { APIGatewayEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { ClassValidatorMiddleware } from 'middy-middleware-class-validator';
import JSONErrorHandlerMiddleware from 'middy-middleware-json-error-handler';

export type Class<T> = new (...args: any[]) => T;

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
    const { body } = b.event;
    console.info(`enter-${b.context.functionName}`, { event: body });
  },
  after: b => {
    // @ts-ignore
    const { body, response } = b.event;
    console.info(`exit-${b.context.functionName}`, { event: body, response });
  }
};

export type Body<T, B = {}> = Omit<T, 'body'> & {
  body: B;
};

export const middy = <T extends object, TEvent = Body<APIGatewayEvent, T>, TResult = any>(
  classType: Class<T>,
  handler: (x: { event: TEvent; context: Context }) => Promise<TResult>
) =>
  middyBase((event: TEvent, context: Context) => handler({ event, context }))
    .use(logger)
    .use(jsonResponse);
// .use(new ClassValidatorMiddleware({ classType }))
// .use(JSONErrorHandlerMiddleware());
