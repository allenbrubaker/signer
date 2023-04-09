import { inject, injectable } from 'inversify';
import { Key, KEY_SCHEMA, Models } from 'src/types';
import { DbService, DB_SERVICE, IDbService } from './db-service';
import { generateKeyPair, generateKeyPairSync } from 'crypto';

export const KEY_DB_SERVICE = Symbol('KeyDbService');
export interface IKeyDbService {
  keys(): Promise<Key[]>;
  create(force?: boolean): Promise<void>;
  seed(count?: number): Promise<Key[] | undefined>;
}

type KeyPair = {
  publicKey: string;
  privateKey: string;
};

@injectable()
export class KeyDbService implements IKeyDbService {
  static readonly table = Models.key;
  constructor(@inject(DB_SERVICE) private _db: IDbService) {}

  async keys(): Promise<Key[]> {
    return await this._db.all<Key>(KeyDbService.table);
  }

  async seed(count: number = 100): Promise<Key[] | undefined> {
    console.log('enter-key-seed', { count });
    const existingCount = await this._db.count(KeyDbService.table);
    if (existingCount) {
      console.log('skip-key-seed', { existingCount });
      return;
    }
    const keys = (await Promise.all([...Array(count)].map(this.generate))).map<Key>(key => ({
      id: DbService.newId(),
      private: key.privateKey,
      public: key.publicKey
    }));
    await this._db.upsertBulk(KeyDbService.table, keys);
    console.log('exit-key-seed', { upserted: keys.length });
    return keys;
  }

  private async generate(): Promise<KeyPair> {
    return new Promise((resolve, reject) => {
      generateKeyPair(
        'rsa',
        {
          modulusLength: 512,
          publicKeyEncoding: {
            type: 'spki',
            format: 'pem'
          },
          privateKeyEncoding: {
            type: 'pkcs8',
            format: 'pem'
          }
        },
        (err, publicKey, privateKey) => {
          if (err) reject(err);
          else resolve({ privateKey, publicKey });
        }
      );
    });
  }

  async create(force?: boolean): Promise<void> {
    await (force ? this._db.recreate(KEY_SCHEMA) : this._db.create(KEY_SCHEMA));
  }
}
