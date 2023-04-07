import 'reflect-metadata'; // prerequisite for inversify

import { middyApi } from '@core/middleware';
import { IStartupService, STARTUP_SERVICE } from '@services/startup-service';
import { IsString } from 'class-validator';
import { container } from 'src/provider';

// class PostHelloRequest {}
// export const postHello = middy(PostHelloRequest, async ({ context, event }) => {
//   console.log('enter-enter-enter');
//   const service = container.get<IStartupService>(STARTUP_SERVICE);
//   await service.setup();
//   console.log(`hello universe!`, { lambda: context.functionName, body: event.body });
//   return { hello: 'world' };
// });

const hello = async () => {
  const service = container.get<IStartupService>(STARTUP_SERVICE);
  await service.setup();
  console.log(`hello universe!`);
  return { hello: 'world' };
};

hello();
