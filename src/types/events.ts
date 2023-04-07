import { IsInt, IsString, Min } from 'class-validator';
import { Key } from './models';

export abstract class Event {}

export class StartSignCommand implements Event {
  @IsInt()
  @Min(1)
  batchSize: number;
}

export class SignBatchCommand implements Event {
  constructor(init?: Partial<SignBatchCommand>) {
    Object.assign(this, init);
  }
  @IsString({ each: true })
  messageIds: string[];
}

export class AvailableKeyEvent implements Event, Omit<Key, 'public'> {
  constructor(key?: Key) {
    Object.assign(this, { ...key, public: undefined });
  }

  @IsString()
  id: string;
  @IsString()
  private: string;
}
