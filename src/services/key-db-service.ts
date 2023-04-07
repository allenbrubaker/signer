import { inject, injectable } from 'inversify';
import { Key, KEY_SCHEMA, Models } from 'src/types';
import { DbService, DB_SERVICE, IDbService } from './db-service';
import { generateKeyPairSync } from 'crypto';

export const KEY_DB_SERVICE = Symbol('KeyDbService');
export interface IKeyDbService {
  keys(): Promise<Key[]>;
  create(): Promise<void>;
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
    console.log('enter-key-seed');
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
    return keys;
  }

  private generate(): KeyPair {
    return generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem'
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem',
        cipher: 'aes-256-cbc',
        passphrase: 'top secret'
      }
    });
  }

  async create(): Promise<void> {
    await this._db.create(KEY_SCHEMA);
  }
}
