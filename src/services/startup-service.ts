import { inject, injectable } from 'inversify';
import { Models } from 'src/types';
import { IKeyDbService, KEY_DB_SERVICE } from './key-db-service';
import { IMessageDbService, MESSAGE_DB_SERVICE } from './message-db-service';
import { IKeyService, KEY_SERVICE } from './key-service';
import { delay } from '@core/utils';

export const STARTUP_SERVICE = Symbol('StartupService');
export interface IStartupService {
  setup(): Promise<void>;
}

@injectable()
export class StartupService implements IStartupService {
  constructor(
    @inject(KEY_DB_SERVICE) private _key: IKeyDbService,
    @inject(MESSAGE_DB_SERVICE) private _message: IMessageDbService,
    @inject(KEY_SERVICE) private _keyQueue: IKeyService
  ) {}

  async setup() {
    console.log('enter-setup');

    console.log('create-queues');
    const url = await this._keyQueue.createQueue();
    console.log(`URL: ` + url);
    await this._keyQueue.purgeQueue();

    console.log('create-and-seed-tables');
    await this._key.create();
    await this._key.seed();
    // await this._message.create(true);
    // await this._message.seed();

    const keys = await this._key.keys();

    console.log('enqueue-keys');
    await this._keyQueue.enqueue(...keys);

    await delay(1000);
    const attributes = await this._keyQueue.attributes();
    console.log(attributes);
    const key = await this._keyQueue.dequeue();
    // console.log('DEQUEUE', key);

    console.log('exit-setup');
  }
}
