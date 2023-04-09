import { inject, injectable } from 'inversify';
import { Key, Models, Signature, SIGNATURE_SCHEMA } from 'src/types';
import { DB_SERVICE, IDbService } from './db-service';

export const SIGNATURE_DB_SERVICE = Symbol('SignatureDbService');
export interface ISignatureDbService {
  count(): Promise<number>;
  recreate(): Promise<void>;
  bulkUpsert(signatures: Signature[]): Promise<void>;
}

@injectable()
export class SignatureDbService implements ISignatureDbService {
  static readonly table = Models.signature;
  constructor(@inject(DB_SERVICE) private _db: IDbService) {}

  async count(): Promise<number> {
    return (await this._db.count(SignatureDbService.table)) ?? 0;
  }

  async recreate(): Promise<void> {
    console.log('enter-recreate-signature-table');
    await this._db.recreate(SIGNATURE_SCHEMA);
    console.log('exit-recreate-signature-table');
  }

  async bulkUpsert(signatures: Signature[]): Promise<void> {
    await this._db.upsertBulk(SignatureDbService.table, signatures);
  }
}
