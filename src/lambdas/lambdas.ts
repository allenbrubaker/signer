import { middy } from '@core/middleware';
import { SignBatchCommand, StartSignCommand, StartupRequest, UnsignedMessageIdsRequest } from 'src/types';
import { container } from 'src/provider';
import { KEY_DB_SERVICE } from '@services/key-db-service';
import { IMessageDbService, MESSAGE_DB_SERVICE } from '@services/message-db-service';
import { ISignService, SIGN_SERVICE } from '@services/sign-service';
import { IStartupService, STARTUP_SERVICE } from '@services/startup-service';

export const startup = middy(StartupRequest, async () => {
  const service = container.get<IStartupService>(STARTUP_SERVICE);
  return await service.setup();
});

export const unsignedMessageIds = middy(UnsignedMessageIdsRequest, async () => {
  const service = container.get<IMessageDbService>(MESSAGE_DB_SERVICE);
  return await service.unsignedMessageIds();
});

export const startSign = middy(StartSignCommand, async ({ event: { body: config } }) => {
  const service = container.get<ISignService>(SIGN_SERVICE);
  await service.start(config);
});

export const sign = middy(SignBatchCommand, async ({ event: { body: batch } }) => {
  const service = container.get<ISignService>(SIGN_SERVICE);
  await service.sign(batch);
});
