import { inject, injectable } from 'inversify';
import {
  CreateQueueCommand,
  GetQueueAttributesCommand,
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
  createQueue(): Promise<string>;
  purgeQueue(): Promise<void>;
  dequeue(): Promise<Key>;
  enqueue(...keys: Key[]): Promise<void>;
  attributes(): Promise<QueueAttributes>;
}

type QueueAttributes = { QueueArn: string; ApproximateNumberOfMessages: string };

@injectable()
export class KeyService implements IKeyService {
  private _client: SQSClient;

  constructor(@inject(ENV_SERVICE) private _env: IEnvService, @inject(EVENT_SERVICE) private _event: IEventService) {
    this._client = new SQSClient({ endpoint: `http://${process.env.LOCALSTACK_HOSTNAME}:4566` });
  }

  private _url?: string;
  private async url() {
    if (!this._url)
      this._url = (await this._client.send(new GetQueueUrlCommand({ QueueName: this._env.keyQueue }))).QueueUrl;
    return this._url;
  }
  static readonly MESSAGE_GROUP_ID = '';

  async attributes(): Promise<QueueAttributes> {
    const url = await this.url();
    const { Attributes } = await this._client.send(
      new GetQueueAttributesCommand({ QueueUrl: url, AttributeNames: ['QueueArn', 'ApproximateNumberOfMessages'] })
    );
    return Attributes || ({} as any);
  }
  async createQueue(): Promise<string> {
    console.log('enter-create-queue');
    const { QueueUrl } = await this._client.send(
      new CreateQueueCommand({
        QueueName: this._env.keyQueue,
        Attributes: { FifoQueue: 'true' /*, BatchSize: '1' */ }
      })
    );
    const attributes = await this.attributes();
    this._url = QueueUrl;
    const arn = attributes.QueueArn;
    await this._event.addQueueTarget(new AvailableKeyEvent(), arn, KeyService.MESSAGE_GROUP_ID);
    console.log('exit-create-queue', { QueueUrl });
    return QueueUrl!;
  }

  async purgeQueue() {
    const url = await this.url();
    this._client.send(new PurgeQueueCommand({ QueueUrl: url }));
  }

  async dequeue(): Promise<Key> {
    console.log('enter-dequeue-key');
    const url = await this.url();
    const { Messages } = await this._client.send(
      new ReceiveMessageCommand({ QueueUrl: url, MaxNumberOfMessages: 1, WaitTimeSeconds: 600 })
    );
    const body = Messages?.[0]?.Body;
    if (!body) throw Error('unable-to-find-available-key');
    const key = JSON.parse(body) as Key;
    console.log('exit-dequeue-key', { id: key.id });
    return key;
  }
  
  async enqueue(...keys: Key[]): Promise<void> {
    return this._event.publish(...keys.map(key => new AvailableKeyEvent(key)));
  }
}
