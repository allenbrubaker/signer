import { IsDate, IsDateString, IsOptional, IsString, MinLength } from 'class-validator';

export abstract class Model {
  @MinLength(10)
  id: string;
}

export class Key extends Model {
  @IsString()
  private: string;
  @IsString()
  public: string;
}

export class Message extends Model {
  @IsString()
  message: string; // message to be signed
  @IsString()
  @IsOptional()
  signature?: string; // encrypted message hash using private key
  @IsString()
  @IsOptional()
  keyId?: string; // foreign key to key record used to sign this message.
}
