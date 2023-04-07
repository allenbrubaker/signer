import { inject, injectable } from 'inversify';
import { SignBatchCommand, StartSignCommand, Message, Key } from '@type/index';
import { API_SERVICE, IApiService } from './api-service';
import { EVENT_SERVICE, IEventService } from './event-service';
import { IMessageDbService, MESSAGE_DB_SERVICE } from './message-db-service';
import { sign, constants } from 'crypto';
import { IKeyService, KEY_SERVICE } from './key-service';

export const SIGN_SERVICE = Symbol('SignService');
export interface ISignService {
  start(_: StartSignCommand): Promise<void>;
  sign(_: SignBatchCommand): Promise<void>;
}

@injectable()
export class SignService implements ISignService {
  constructor(
    @inject(KEY_SERVICE) private _key: IKeyService,
    @inject(EVENT_SERVICE) private _event: IEventService,
    @inject(MESSAGE_DB_SERVICE) private _message: IMessageDbService
  ) {}

  async start({ batchSize }: StartSignCommand): Promise<void> {
    console.log('enter-sign-start');
    const ids = await this._message.unsignedMessageIds();
    const batches = Object.values(
      ids.reduce<Record<number, string[]>>((group, item, i) => {
        (group[Math.floor(i / batchSize)] ||= []).push(item);
        return group;
      }, {})
    );
    const commands = batches.map<SignBatchCommand>(messageIds => new SignBatchCommand({ messageIds }));
    await this._event.publish(commands);
    console.log('exit-sign-start');
  }

  async sign({ messageIds }: SignBatchCommand): Promise<void> {
    const [key, messages] = await Promise.all([this._key.dequeue(), this._message.messagesByIds(messageIds)]);

    messages.map(message => {
      message.signature = this.signMessage(key, message);
      message.keyId = key.id;
    });

    await this._key.enqueue(key);
    await this._message.bulkUpsert(messages);
  }

  private signMessage = (key: Key, message: Message) =>
    sign('sha256', Buffer.from(message.message), {
      key: key.private,
      padding: constants.RSA_PKCS1_PSS_PADDING
    }).toString('base64');
}
