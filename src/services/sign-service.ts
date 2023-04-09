import { inject, injectable } from 'inversify';
import { SignBatchCommand, StartSignCommand, Message, Key, Signature, Queue } from '@type/index';
import { API_SERVICE, IApiService } from './api-service';
import { EVENT_SERVICE, IEventService } from './event-service';
import { IMessageDbService, MESSAGE_DB_SERVICE } from './message-db-service';
import { sign, constants } from 'crypto';
import { IQueueService, QUEUE_SERVICE } from './queue-service';
import { delay, getBatches } from '@core/utils';
import { ISignatureDbService, SIGNATURE_DB_SERVICE } from './signature-db-service';
import { IKeyDbService, KEY_DB_SERVICE } from './key-db-service';
import { generateKeyPairSync } from 'crypto';

export const SIGN_SERVICE = Symbol('SignService');
export interface ISignService {
  start(_: StartSignCommand): Promise<void>;
  sign(_: SignBatchCommand): Promise<void>;
  signMessage(key: Key, message: string): string;
}

@injectable()
export class SignService implements ISignService {
  constructor(
    @inject(KEY_DB_SERVICE) private _key: IKeyDbService,
    @inject(QUEUE_SERVICE) private _queue: IQueueService,
    @inject(EVENT_SERVICE) private _event: IEventService,
    @inject(MESSAGE_DB_SERVICE) private _message: IMessageDbService,
    @inject(SIGNATURE_DB_SERVICE) private _signature: ISignatureDbService
  ) {}

  async start({ batchSize }: StartSignCommand): Promise<void> {
    console.log('enter-sign-start');
    await this._queue.purge(Queue.key);
    await this._queue.purge(Queue.sign);
    await this._signature.recreate();

    console.log('enqueue-keys');
    const keys = await this._key.keys();
    await this._queue.enqueueKeys(keys);

    console.log('publish-batches');
    const ids = await this._message.ids();
    const commands = getBatches(ids, batchSize, (ids, i) => new SignBatchCommand({ batch: i, messageIds: ids }));
    await this._event.publish(commands);

    console.log('exit-sign-start');
  }

  async sign({ batch, messageIds }: SignBatchCommand): Promise<void> {
    const log: Record<string, unknown> = { batch, ids: messageIds.length };
    console.log('enter-sign-batch', log);
    const [key, messages] = await Promise.all([
      this._queue.dequeue(Queue.key),
      this._message.messagesByIds(messageIds)
    ]);

    log.keyId = key.id;

    console.log('signing-batch', log);
    const signatures = messages.map<Signature>(message => ({
      id: message.id,
      keyId: key.id,
      signature: this.signMessage(key, message.message)
    }));
    console.log('signed-batch', log);

    await this._queue.enqueueKeys([key]);
    console.log('saving-batch', log);

    await this._signature.bulkUpsert(signatures);
    console.log('exit-sign-batch', log);
  }

  public signMessage = (key: Key, message: string): string => {
    return sign(null, Buffer.from(message), { key: key.private }).toString('base64');
  };
}
