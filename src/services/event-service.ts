import { EventBridgeClient, PutEventsCommand, PutRuleCommand, PutTargetsCommand } from '@aws-sdk/client-eventbridge';
import { injectable } from 'inversify';
import { Event } from 'src/types';

export const EVENT_SERVICE = Symbol('EventService');
export interface IEventService {
  publish(events: Event[]): Promise<void>;
  addQueueTarget(pattern: Event, arn: string, messageGroupId?: string): Promise<void>;
}

@injectable()
export class EventService implements IEventService {
  readonly _client = new EventBridgeClient({ endpoint: `http://${process.env.LOCALSTACK_HOSTNAME}:4566` });
  constructor() {}
  async publish(events: Event[]) {
    const log = { count: events.length, event: events[0].constructor.name };
    console.log('enter-publish-events', log);
    await this._client.send(
      new PutEventsCommand({
        Entries: events.map(e => ({ DetailType: e.constructor.name, Detail: JSON.stringify(e) }))
      })
    );
    console.log('exit-publish-events', log);
  }

  async addQueueTarget(pattern: Event, arn: string, messageGroupId?: string) {
    const name = pattern.constructor.name;
    const log = { event: name, arn };
    console.log('enter-add-queue-target', log);
    await this._client.send(
      new PutRuleCommand({
        Name: name,
        EventPattern: JSON.stringify({ 'detail-type': [name] })
      })
    );
    await this._client.send(
      new PutTargetsCommand({
        Rule: name,
        Targets: [{ Id: name, Arn: arn, SqsParameters: { MessageGroupId: messageGroupId } }]
      })
    );
    console.log('exit-add-queue-target', log);
  }
}
