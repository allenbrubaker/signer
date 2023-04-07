import { inject, injectable } from 'inversify';
import {
  CreateQueueCommand,
  GetQueueUrlCommand,
  PurgeQueueCommand,
  ReceiveMessageCommand,
  SQSClient
} from '@aws-sdk/client-sqs';
import { ENV_SERVICE, IEnvService } from './env-service';
import { Key } from '@type/models';
import { EVENT_SERVICE, IEventService } from './event-service';
import { AvailableKeyEvent } from '@type/events';

export const KEY_SERVICE = Symbol('KeyService');
export interface IKeyService {
  createQueue(): Promise<void>;
  purgeQueue(): Promise<void>;
  dequeue(): Promise<Key>;
  enqueue(key: Key): Promise<void>;
}

@injectable()
export class KeyService implements IKeyService {
  private _client: SQSClient;

  constructor(@inject(ENV_SERVICE) private _env: IEnvService, @inject(EVENT_SERVICE) private _event: IEventService) {
    this._client = new SQSClient({ region: _env.region });
  }

  private _url?: string;
  private async url() {
    return (this._url ||= (
      await this._client.send(new GetQueueUrlCommand({ QueueName: this._env.keyQueue }))
    ).QueueUrl);
  }

  async createQueue(): Promise<void> {
    const { QueueUrl } = await this._client.send(
      new CreateQueueCommand({ QueueName: this._env.keyQueue, Attributes: { FifoQueue: 'true', BatchSize: '1' } })
    );
    this._url = QueueUrl;
  }

  async purgeQueue() {
    const url = await this.url();
    this._client.send(new PurgeQueueCommand({ QueueUrl: url }));
  }

  async dequeue(): Promise<Key> {
    const url = await this.url();
    const { Messages } = await this._client.send(
      new ReceiveMessageCommand({ QueueUrl: url, MaxNumberOfMessages: 1, WaitTimeSeconds: 600 })
    );
    const body = Messages?.[0]?.Body;
    if (!body) throw Error('unable-to-find-available-key');
    return JSON.parse(body) as Key;
  }

  private delay = (minMs: number, maxMs: number) =>
    new Promise(resolve => setTimeout(resolve, minMs + Math.random() * (maxMs - minMs)));

  async enqueue(key: Key): Promise<void> {
    return this._event.publish(new AvailableKeyEvent(key));
  }
}
