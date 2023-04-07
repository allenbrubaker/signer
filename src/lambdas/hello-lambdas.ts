import { middy } from '@core/middleware';
import { IsString } from 'class-validator';

class PostHelloRequest {
  @IsString()
  name: string;
}

export const postHello = middy(PostHelloRequest, async ({ context, event }) => {
  console.log(`hello universe!`, context.functionName, event.body);
  return { hello: 'world' };
});
