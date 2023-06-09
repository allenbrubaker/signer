import { inject, injectable } from 'inversify';
import { IKeyDbService, KEY_DB_SERVICE } from './key-db-service';
import { IMessageDbService, MESSAGE_DB_SERVICE } from './message-db-service';
import { IQueueService, QUEUE_SERVICE } from './queue-service';
import { ISignatureDbService, SIGNATURE_DB_SERVICE } from './signature-db-service';
import { Queue } from '@type/enums';
import { AvailableKeyEvent, SeedMessageCommand, SignBatchCommand } from '@type/events';
import { ISignService, SIGN_SERVICE } from './sign-service';
import { EVENT_SERVICE, IEventService } from './event-service';

export const STARTUP_SERVICE = Symbol('StartupService');
export interface IStartupService {
  setup(): Promise<void>;
}

@injectable()
export class StartupService implements IStartupService {
  constructor(
    @inject(KEY_DB_SERVICE) private _key: IKeyDbService,
    @inject(MESSAGE_DB_SERVICE) private _message: IMessageDbService,
    @inject(SIGNATURE_DB_SERVICE) private _signature: ISignatureDbService,
    @inject(QUEUE_SERVICE) private _queue: IQueueService
  ) {}

  async setup() {
    console.log('enter-setup');

    console.log('create-queues');
    await this._queue.create(Queue.key, new AvailableKeyEvent());
    await this._queue.register(Queue.sign, new SignBatchCommand());
    await this._queue.register(Queue.seed, new SeedMessageCommand());

    console.log('create-and-seed-tables');
    await this._key.create();
    await this._key.seed();
    await this._signature.recreate();
    await this._message.create();
    // await this._message.seed();
    await this._message.seedByLambdas();

    console.log('exit-setup');
  }
}
