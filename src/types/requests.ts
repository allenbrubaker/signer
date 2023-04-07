import { IsString } from 'class-validator';

export class StartupRequest {}
export class UnsignedMessageIdsRequest {}
export class UnsignedMessageIdsReply {
  @IsString({ each: true })
  ids: string[];
}
