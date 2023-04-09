import 'reflect-metadata'; // prerequisite for inversify

import { middyApi, middySqs } from '@core/middleware';
import { SeedMessageCommand, SignBatchCommand, StartSignCommand, StartupRequest } from 'src/types';
import { container } from 'src/provider';
import { IMessageDbService, MESSAGE_DB_SERVICE } from '@services/message-db-service';
import { ISignService, SIGN_SERVICE } from '@services/sign-service';
import { IStartupService, STARTUP_SERVICE } from '@services/startup-service';

export const startup = middyApi(StartupRequest, async () => {
  const service = container.get<IStartupService>(STARTUP_SERVICE);
  await service.setup();
});

export const startSign = middyApi(StartSignCommand, async ({ event: { body: config } }) => {
  const service = container.get<ISignService>(SIGN_SERVICE);
  await service.start(config);
});

export const sign = middySqs(SignBatchCommand, async ({ event: { body: batch } }) => {
  const service = container.get<ISignService>(SIGN_SERVICE);
  await service.sign(batch);
});

export const seed = middySqs(SeedMessageCommand, async ({ event: { body } }) => {
  const service = container.get<IMessageDbService>(MESSAGE_DB_SERVICE);
  await service.seed(body.count, true);
});
