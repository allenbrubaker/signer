import {
  AttributeValue,
  CreateTableCommand,
  CreateTableCommandInput,
  DeleteTableCommand,
  DynamoDBClient,
  ListTablesCommand,
  waitUntilTableExists,
  WriteRequest
} from '@aws-sdk/client-dynamodb';
import { BatchWriteCommand, GetCommand, PutCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import cuid from 'cuid';
import { inject, injectable } from 'inversify';
import { from, lastValueFrom, map, mergeMap, toArray } from 'rxjs';
import { ENV_SERVICE, IEnvService } from './env-service';

export interface IDbService {
  upsert<T>(table: string, item: Partial<T>): Promise<void>;
  count(table: string): Promise<number | undefined>;
  upsertBulk<T>(table: string, items: T[]): Promise<void>;
  create(schema: CreateTableCommandInput): Promise<boolean>;
  tables(): Promise<string[]>;
  delete(table: string): Promise<boolean>;
  drop(schema: CreateTableCommandInput): Promise<void>;
  findByIds<T>(table: string, ids: string[]): Promise<T[]>;
  all<T>(table: string): Promise<T[]>;
  scan<T>(table: string, filter?: string, select?: string[]): Promise<Partial<T>[]>;
}

export const DB_SERVICE = Symbol('DbService');

@injectable()
export class DbService implements IDbService {
  _client: DynamoDBClient;
  constructor(@inject(ENV_SERVICE) private _env: IEnvService) {
    this._client = new DynamoDBClient({ endpoint: `http://${process.env.LOCALSTACK_HOSTNAME}:4566` });
  }

  static newId() {
    return Math.random().toString(36).slice(2); //cuid();
  }

  async all<T>(table: string): Promise<T[]> {
    const all = await this.scan(table);
    return all as T[];
  }

  async count(table: string): Promise<number | undefined> {
    const { Count } = await this._client.send(new ScanCommand({ Select: 'COUNT', TableName: table }));
    return Count;
  }

  async upsert<T>(table: string, item: Partial<T>): Promise<void> {
    await this._client.send(new PutCommand({ Item: item as Record<string, unknown>, TableName: table }));
  }

  async upsertBulk<T>(table: string, items: T[]): Promise<void> {
    const log = { table, count: items.length };
    console.log('enter-bulk-upsert', log);

    // max batch size is 25
    const batches = Object.values(
      items
        .map<WriteRequest>(x => ({ PutRequest: { Item: x as Record<string, AttributeValue> } }))
        .reduce<Record<number, WriteRequest[]>>((group, item, i) => {
          (group[Math.floor(i / 25)] ||= []).push(item);
          return group;
        }, {})
    ).map<BatchWriteCommand>(x => new BatchWriteCommand({ RequestItems: { [table]: x } }));

    await Promise.all(batches.map(command => this._client.send(command)));
    console.log('exit-bulk-upsert', log);
  }

  async create(schema: CreateTableCommandInput): Promise<boolean> {
    const log = { table: schema.TableName };
    console.log('enter-create-table', log);
    const tables = await this.tables();
    if (tables.find(x => x === schema.TableName)) {
      console.log('table-already-exists', log);
      return false;
    }
    this._client.send(new CreateTableCommand(schema));
    await waitUntilTableExists(
      { client: this._client, maxWaitTime: 15, maxDelay: 2, minDelay: 1 },
      { TableName: schema.TableName }
    );
    console.log('table-created', log);
    return true;
  }

  async tables(): Promise<string[]> {
    const { TableNames } = await this._client.send(new ListTablesCommand({ Limit: 100 }));
    return TableNames ?? [];
  }

  async delete(table: string): Promise<boolean> {
    console.log('enter-delete-table', { table });
    const tables = await this.tables();
    if (!tables.find(x => x === table)) {
      console.log('table-does-not-exist');
      return false;
    }
    await this._client.send(new DeleteTableCommand({ TableName: table }));
    console.log('table-deleted', { table });
    return true;
  }

  async drop(schema: CreateTableCommandInput) {
    const log = { table: schema.TableName };
    await this.delete(schema.TableName!);
    await this.create(schema);
  }

  async findByIds<T>(table: string, ids: string[]): Promise<T[]> {
    const log = { table, count: ids.length };
    console.log('enter-find-by-ids', log);
    const commands = ids.map(id => new GetCommand({ TableName: table, Key: { id } }));
    // process db queries at a throttled concurrency rate.
    const merge$ = from(commands).pipe(
      mergeMap(cmd => from(this._client.send(cmd)), this._env.dbConcurrency),
      map(x => x.Item as T),
      toArray()
    );
    const x = await lastValueFrom(merge$);
    console.log('exit-find-by-ids', log);
    return x;
  }

  async scan<T>(table: string, filter?: string, select?: string[]): Promise<Partial<T>[]> {
    const log: Record<string, unknown> = { table, filter };
    console.log('enter-scan', log);
    const items: T[] = [];
    let lastEvaluatedKey = undefined as any;
    let i = 0;
    do {
      const { Items, LastEvaluatedKey } = await this._client.send(
        new ScanCommand({
          TableName: table,
          FilterExpression: filter,
          AttributesToGet: select,
          ExclusiveStartKey: lastEvaluatedKey
        })
      );
      const it = (Items ?? []) as T[];
      items.push(...it);
      log.count = items?.length;
      log.page = i++;
      lastEvaluatedKey = LastEvaluatedKey;
      if (lastEvaluatedKey) console.log('scan-paging', log);
    } while (lastEvaluatedKey);
    console.log('exit-scan', log);
    return items;
  }
}
