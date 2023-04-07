import { IsInt, IsString, Min } from 'class-validator';
import { Key } from './models';

export abstract class Event {}

export class StartSignCommand extends Event {
  @IsInt()
  @Min(1)
  batchSize: number;
}

export class SignBatchCommand extends Event {
  constructor(init?: Partial<SignBatchCommand>) {
    super();
    Object.assign(this, init);
  }
  @IsString({ each: true })
  messageIds: string[];
}

export class AvailableKeyEvent extends Event implements Key {
  constructor(key?: Key) {
    super();
    Object.assign(this, key);
  }

  @IsString()
  id: string;
  @IsString()
  private: string;
  @IsString()
  public: string;
}
