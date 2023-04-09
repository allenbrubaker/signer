import { IsInt, IsString, Min } from 'class-validator';
import { Key } from './models';

export abstract class Event {}

export class SeedMessageCommand implements Event {
  constructor(init?: Partial<SeedMessageCommand>) {
    Object.assign(this, init);
  }

  @IsInt()
  @Min(1)
  count: number;
}

export class StartSignCommand implements Event {
  @IsInt()
  @Min(1)
  batchSize: number;
}

export class SignBatchCommand implements Event {
  constructor(init?: Partial<SignBatchCommand>) {
    Object.assign(this, init);
  }
  @IsInt()
  batch: number;
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
