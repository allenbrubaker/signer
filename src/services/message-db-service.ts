import { inject, injectable } from 'inversify';
import Jabber from 'jabber';
import { Message, Models, MESSAGE_SCHEMA } from 'src/types';
import { DbService, DB_SERVICE, IDbService } from './db-service';

export const MESSAGE_DB_SERVICE = Symbol('MessageDbService');
export interface IMessageDbService {
  upsert(record: Message): Promise<void>;
  seed(count?: number): Promise<void>;
  create(force?: boolean): Promise<void>;
  messagesByIds(ids: string[]): Promise<Message[]>;
  bulkUpsert(messages: Message[]): Promise<void>;
  unsignedMessageIds(): Promise<string[]>;
}

@injectable()
export class MessageDbService implements IMessageDbService {
  static readonly table = Models.message;
  constructor(@inject(DB_SERVICE) private _db: IDbService) {}

  async upsert(message: Message) {
    await this._db.upsert(MessageDbService.table, message);
  }

  async seed(count: number = 100000) {
    console.log('enter-message-seed');
    const existingCount = await this._db.count(MessageDbService.table);
    if (existingCount) {
      console.log('skip-message-seed', { existingCount });
      return;
    }
    const jabber = new Jabber();
    const data = Array(count)
      .fill(null)
      .map<Message>(() => ({
        id: DbService.newId(),
        message: jabber.createFullName()
      }));
    await this._db.upsertBulk(MessageDbService.table, data);
    console.log('exit-message-seed', { count });
  }

  async create(force = false): Promise<void> {
    console.log('enter-create-key-table', { force });
    await (force ? this._db.drop : this._db.create)(MESSAGE_SCHEMA);
    console.log('exit-create-key-table', { force });
  }

  async messagesByIds(ids: string[]): Promise<Message[]> {
    console.log('enter-message-by-ids');
    const messages = this._db.findByIds<Message>(MessageDbService.table, ids);
    console.log('exit-message-by-ids');
    return messages;
  }

  async bulkUpsert(messages: Message[]): Promise<void> {
    await this._db.upsertBulk(MessageDbService.table, messages);
  }

  async unsignedMessageIds(): Promise<string[]> {
    const ids = (await this._db.scan<Message>(MessageDbService.table, 'keyId is null', ['id'])).map(x => x.id!);
    return ids;
  }
}
