import { inject, injectable } from 'inversify';
import { SignBatchCommand, StartSignCommand, Message, Key, Signature, Queue } from '@type/index';
import { API_SERVICE, IApiService } from './api-service';
import { EVENT_SERVICE, IEventService } from './event-service';
import { IMessageDbService, MESSAGE_DB_SERVICE } from './message-db-service';
import { sign, constants } from 'crypto';
import { IQueueService, QUEUE_SERVICE } from './queue-service';
import { getBatches } from '@core/utils';
import { ISignatureDbService, SIGNATURE_DB_SERVICE } from './signature-db-service';
import { IKeyDbService, KEY_DB_SERVICE } from './key-db-service';

export const SIGN_SERVICE = Symbol('SignService');
export interface ISignService {
  start(_: StartSignCommand): Promise<void>;
  sign(_: SignBatchCommand): Promise<void>;
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
    await this._signature.recreate(true);

    console.log('enqueue-keys');
    const keys = await this._key.keys();
    await this._queue.enqueueKeys(keys);

    const ids = await this._message.ids();
    const commands = getBatches(ids, batchSize, (ids, i) => new SignBatchCommand({ batch: i, messageIds: ids }));
    await this._event.publish(commands);
    console.log('exit-sign-start');
  }

  async sign({ batch, messageIds }: SignBatchCommand): Promise<void> {
    const log = { batch, ids: messageIds.length };
    console.log('enter-sign-batch', log);
    const [key, messages] = await Promise.all([
      this._queue.dequeue(Queue.key),
      this._message.messagesByIds(messageIds)
    ]);

    console.log('signing-batch', log);
    const signatures = messages.map(
      message => new Signature({ id: message.id, keyId: key.id, signature: this.signMessage(key, message) })
    );
    console.log('signed-batch', log);

    await this._queue.enqueueKeys([key]);
    console.log('saving-batch', log);

    await this._signature.bulkUpsert(signatures);
    console.log('exit-sign-batch', log);
  }

  private signMessage = (key: Key, message: Message) =>
    sign('sha256', Buffer.from(message.message), {
      key: key.private,
      padding: constants.RSA_PKCS1_PSS_PADDING
    }).toString('base64');
}
