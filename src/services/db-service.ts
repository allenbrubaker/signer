import {
  CreateTableCommand,
  CreateTableCommandInput,
  DeleteTableCommand,
  DynamoDBClient,
  ExecuteStatementCommand,
  ListTablesCommand,
  waitUntilTableExists
} from '@aws-sdk/client-dynamodb';
import { BatchGetCommand, BatchWriteCommand, PutCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { inject, injectable } from 'inversify';
import { ENV_SERVICE, IEnvService } from './env-service';
import { getBatches } from '@core/utils';
import { NodeHttpHandler } from '@aws-sdk/node-http-handler';
import { Agent } from 'http';
import { Agent as HttpsAgent } from 'https';
import { defer, from, lastValueFrom, mergeMap, scan, tap } from 'rxjs';

export type ScanProps = { table: string; filter?: string; select?: string[] };

export interface IDbService {
  upsert<T>(table: string, item: Partial<T>): Promise<void>;
  count(table: string): Promise<number | undefined>;
  upsertBulk<T>(table: string, items: T[], concurrency?: number): Promise<void>;
  create(schema: CreateTableCommandInput): Promise<boolean>;
  tables(): Promise<string[]>;
  delete(table: string): Promise<boolean>;
  recreate(schema: CreateTableCommandInput): Promise<void>;
  findByIds<T>(table: string, ids: string[]): Promise<T[]>;
  all<T>(table: string): Promise<T[]>;
  scan<T>(_: ScanProps): Promise<Partial<T>[]>;
  sql(query: string): Promise<void>;
}

export const DB_SERVICE = Symbol('DbService');

@injectable()
export class DbService implements IDbService {
  _client: DynamoDBClient;
  constructor(@inject(ENV_SERVICE) private _env: IEnvService) {
    this._client = new DynamoDBClient({
      endpoint: _env.dynamoUrl,
      region: _env.region,
      requestHandler: new NodeHttpHandler({
        httpAgent: new Agent({ keepAlive: true }),
        httpsAgent: new HttpsAgent({ keepAlive: true })
      })
    });
  }

  static newId() {
    return Math.random().toString(36).slice(2); //cuid();
  }

  async all<T>(table: string): Promise<T[]> {
    const all = await this.scan({ table });
    return all as T[];
  }

  async count(table: string): Promise<number | undefined> {
    const { Count } = await this._client.send(new ScanCommand({ Select: 'COUNT', TableName: table, Limit: 1 }));
    return Count;
  }

  async upsert<T>(table: string, item: Partial<T>): Promise<void> {
    await this._client.send(new PutCommand({ Item: item as Record<string, unknown>, TableName: table }));
  }

  async upsertBulk<T>(table: string, items: T[], concurrency?: number): Promise<void> {
    const log: Record<string, unknown> = { table, count: items.length, concurrency: concurrency ?? 'infinite' };
    const start = Date.now();
    console.log('enter-bulk-upsert', log);

    // max batch size is 25
    const batches = getBatches(
      items,
      25,
      items =>
        new BatchWriteCommand({
          RequestItems: {
            [table]: items.map(x => ({ PutRequest: { Item: x as Record<string, any> } }))
          }
        })
    );

    const saving = Date.now();
    await lastValueFrom(
      from(batches).pipe(
        mergeMap(cmd => defer(() => this._client.send(cmd)), concurrency),
        scan((total, _) => total + 25, 0),
        tap(total => {
          if (total % 100 === 0) {
            const duration = (Date.now() - saving) / 1000;
            console.log(`saved-${table}`, {
              progress: `${total}/${items.length}`,
              rps: Math.round(total / duration),
              duration
            });
          }
        })
      )
    );
    // await Promise.all(batches.map(cmd => this._client.send(cmd)));
    log.duration = Math.round((Date.now() - start) / 1000);
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

  async recreate(schema: CreateTableCommandInput) {
    const log = { table: schema.TableName };
    await this.delete(schema.TableName!);
    await this.create(schema);
  }

  async findByIds<T>(table: string, ids: string[]): Promise<T[]> {
    const log: Record<string, unknown> = { table, ids: ids.length };
    const start = Date.now();
    console.log('enter-find-by-ids', log);

    const batchGetCommands = <T>(ids: T[]) =>
      new BatchGetCommand({ RequestItems: { [table]: { Keys: ids.map(id => ({ id })) } } });
    const b = getBatches(ids, 100, batchGetCommands);
    const responses = await Promise.all(b.map(cmd => this._client.send(cmd)));
    const records = responses.flatMap<T>(x => (x.Responses?.[table] ?? []) as T[]);
    log.records = records.length;
    log.duration = (Date.now() - start) / 1000;
    console.log('exit-find-by-ids', log);
    return records;
  }

  async sql(query: string) {
    console.log('enter-execute-sql');
    await this._client.send(new ExecuteStatementCommand({ Statement: query }));
    console.log('exit-execute-sql');
  }

  async scan<T>({ table, filter, select }: ScanProps): Promise<Partial<T>[]> {
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
          ProjectionExpression: select?.join(','),
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
