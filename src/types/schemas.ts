import { AttributeDefinition, CreateTableCommandInput, KeySchemaElement } from '@aws-sdk/client-dynamodb';
import { Models } from './enums';

type Key = KeySchemaElement & AttributeDefinition;
const id: Key = {
  AttributeName: 'id',
  KeyType: 'HASH',
  AttributeType: 'S'
};

const keyId: Key = {
  AttributeName: 'keyId',
  KeyType: 'RANGE',
  AttributeType: 'S'
};

const SCHEMA: Partial<CreateTableCommandInput> = {
  BillingMode: 'PAY_PER_REQUEST'
};

export const MESSAGE_SCHEMA: CreateTableCommandInput = {
  ...SCHEMA,
  TableName: Models.message,
  KeySchema: [id, keyId],
  AttributeDefinitions: [id, keyId]
};

export const KEY_SCHEMA: CreateTableCommandInput = {
  ...SCHEMA,
  TableName: Models.key,
  KeySchema: [id],
  AttributeDefinitions: [id]
};
