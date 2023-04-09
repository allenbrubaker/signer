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
import { AvailableKeyEvent, Event } from '@type/events';
import { Queue } from '@type/enums';
import { EventBridgeEvent } from 'aws-lambda';

export const QUEUE_SERVICE = Symbol('QueueService');
export interface IQueueService {
  create(queue: Queue, event: Event): Promise<void>;
  purge(queue: Queue): Promise<void>;
  dequeue(queue: Queue): Promise<Key>;
  enqueueKeys(keys: Key[]): Promise<void>;
  attributes(queue: Queue): Promise<QueueAttributes>;
  url(queue: Queue): Promise<string | undefined>;
  register(queue: Queue, event: Event): Promise<void>;
}

type QueueAttributes = { QueueArn: string; ApproximateNumberOfMessages: string };

@injectable()
export class QueueService implements IQueueService {
  private _client: SQSClient;

  constructor(@inject(ENV_SERVICE) private _env: IEnvService, @inject(EVENT_SERVICE) private _event: IEventService) {
    this._client = new SQSClient({ endpoint: `http://${process.env.LOCALSTACK_HOSTNAME}:4566` });
  }

  private _names: Record<Queue, string> = {
    [Queue.key]: this._env.keyQueue,
    [Queue.sign]: this._env.signQueue,
    [Queue.seed]: this._env.seedQueue
  };

  private _urls: Partial<Record<Queue, string>> = {};
  public async url(queue: Queue) {
    if (this._urls[queue]) return this._urls[queue];
    return (this._urls[queue] = (
      await this._client.send(new GetQueueUrlCommand({ QueueName: this._names[queue] }))
    ).QueueUrl!);
  }

  async attributes(queue: Queue): Promise<QueueAttributes> {
    const url = await this.url(queue);
    const { Attributes } = await this._client.send(
      new GetQueueAttributesCommand({ QueueUrl: url, AttributeNames: ['All'] })
    );
    return Attributes || ({} as any);
  }

  isFifo(queue: Queue) {
    return this._names[queue].includes('.fifo');
  }

  async create(queue: Queue, event: Event): Promise<void> {
    const name = this._names[queue];
    const fifo = this.isFifo(queue);
    const log: Record<string, unknown> = { queue: name, fifo, event: event.constructor.name };
    console.log('enter-create-queue', log);

    const { QueueUrl } = await this._client.send(
      new CreateQueueCommand({
        QueueName: name,
        Attributes: fifo ? { FifoQueue: 'true', ContentBasedDeduplication: 'true' } : undefined
      })
    );
    log.url = QueueUrl;
    this._urls[queue] = QueueUrl!;
    await this.register(queue, event);
    console.log('exit-create-queue', log);
  }

  public async register(queue: Queue, event: Event) {
    const fifo = this.isFifo(queue);
    const attributes = await this.attributes(queue);
    const arn = attributes.QueueArn;
    await this._event.addQueueTarget(event, arn, fifo ? 'default' : undefined);
  }

  async purge(queue: Queue): Promise<void> {
    console.log('enter-purge', { queue });
    const url = await this.url(queue);
    await this._client.send(new PurgeQueueCommand({ QueueUrl: url }));
    console.log('exit-purge', { queue });
  }

  async dequeue<T>(queue: Queue): Promise<T> {
    const log: Record<string, unknown> = { queue: this._names[queue] };
    console.log('enter-dequeue', queue);
    const url = await this.url(queue);
    const { Messages } = await this._client.send(
      new ReceiveMessageCommand({ QueueUrl: url, MaxNumberOfMessages: 1, WaitTimeSeconds: 600 })
    );
    const body = Messages?.[0]?.Body;
    if (!body) throw Error('unable-to-find-available-key');
    const item = (JSON.parse(body) as EventBridgeEvent<string, T>).detail;
    // @ts-ignore
    log.id = item.id ?? '';
    console.log('exit-dequeue', log);
    return item;
  }

  async enqueueKeys(keys: Key[]): Promise<void> {
    return this._event.publish(keys.map(key => new AvailableKeyEvent(key)));
  }
}
