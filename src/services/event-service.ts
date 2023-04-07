import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';
import { injectable } from 'inversify';
import { Event } from 'src/types';

export const EVENT_SERVICE = Symbol('EventService');
export interface IEventService {
  publish(...events: Event[]): Promise<void>;
}

@injectable()
export class EventService implements IEventService {
  readonly _client = new EventBridgeClient({ region: 'us-east-1' });
  constructor() {}
  async publish(...events: Event[]) {
    const log = { count: events.length, event: events[0]?.constructor.name };
    console.log('enter-publish-events', log);
    await this._client.send(
      new PutEventsCommand({
        Entries: events.map(e => ({ DetailType: e.constructor.name, Detail: JSON.stringify(e) }))
      })
    );
    console.log('exit-publish-events', log);
  }
}
