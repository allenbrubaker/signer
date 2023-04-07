import { inject, injectable } from 'inversify';
import { Models } from 'src/types';
import { IKeyDbService, KEY_DB_SERVICE } from './key-db-service';
import { IMessageDbService, MESSAGE_DB_SERVICE } from './message-db-service';
import { IKeyService, KEY_SERVICE } from './key-service';

export const STARTUP_SERVICE = Symbol('StartupService');
export interface IStartupService {
  setup(): Promise<void>;
}

@injectable()
export class StartupService implements IStartupService {
  static readonly table = Models.message;
  constructor(
    @inject(KEY_DB_SERVICE) private _key: IKeyDbService,
    @inject(MESSAGE_DB_SERVICE) private _message: IMessageDbService,
    @inject(KEY_SERVICE) private _keyQueue: IKeyService
  ) {}

  async setup() {
    console.log('enter-setup');

    console.log('create-queues');
    await this._keyQueue.createQueue();
    await this._keyQueue.purgeQueue();

    console.log('create-tables');
    await this._key.create();
    await this._message.create();

    console.log('seed-tables');
    await this._message.seed();
    const keys = (await this._key.seed()) ?? (await this._key.keys());

    console.log('enqueue-keys');
    await Promise.all(keys.map(key => this._keyQueue.enqueue(key)));

    console.log('exit-setup');
  }
}
