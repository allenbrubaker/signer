import { default as middyBase, MiddlewareObj } from '@middy/core';
import httpErrorHandler from '@middy/http-error-handler';
import { APIGatewayEvent, EventBridgeEvent, APIGatewayProxyResult, Context, SQSEvent, SQSRecord } from 'aws-lambda';
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
    console.info(`enter-${b.context.functionName}`, { event: b.event });
  },
  after: b => {
    // @ts-ignore
    const { body, response } = b.event;
    console.info(`exit-${b.context.functionName}`, { event: body, response });
  }
};

const parseEvent: MiddlewareObj<SQSEvent, any> = {
  before: b => {
    // @ts-ignore
    b.event = JSON.parse(b.event.Records[0].body) as EventBridgeEvent<string, string>;
    // @ts-ignore
    b.event.body = b.event.detail;
  }
};

const defaultBody: MiddlewareObj<{ body: string }, any> = {
  before: b => {
    b.event.body = b.event.body || '{}';
  }
};

export type Body<T, B = {}> = Omit<T, 'body'> & {
  body: B;
};

export const middySqs = <T extends object, TEvent = Body<EventBridgeEvent<string, T>, T>, TResult = any>(
  classType: Class<T>,
  handler: (x: { event: TEvent; context: Context }) => Promise<TResult>
) =>
  middyBase((event: TEvent, context: Context) => handler({ event, context }))
    .use(parseEvent)
    .use(defaultBody)
    .use(logger)
    .use(new ClassValidatorMiddleware({ classType }));

export const middyApi = <T extends object, TEvent = Body<APIGatewayEvent, T>, TResult = any>(
  classType: Class<T>,
  handler: (x: { event: TEvent; context: Context }) => Promise<TResult>
) =>
  middyBase((event: TEvent, context: Context) => handler({ event, context }))
    .use(logger)
    .use(jsonResponse)
    .use(defaultBody)
    .use(new ClassValidatorMiddleware({ classType }));
// .use(JSONErrorHandlerMiddleware());
