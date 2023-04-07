import { injectable } from 'inversify';

export const ENV_SERVICE = Symbol('EnvService');
export interface IEnvService {
  get region(): string;
  get apiId(): string;
  get apiUrl(): string;
  get dbConcurrency(): number;
  get keyQueue(): string;
}

@injectable()
export class EnvService implements IEnvService {
  constructor() {}
  get region() {
    return this.string('REGION');
  }
  get apiId() {
    return this.string('API_ID');
  }
  get apiUrl() {
    return this.string('API_URL');
  }
  get dbConcurrency() {
    return this.number(`DB_CONCURRENCY`);
  }
  get keyQueue() {
    return this.string(`KEY_QUEUE`);
  }

  private string(key: string) {
    return String(process.env[key]);
  }
  private number(key: string) {
    return Number(process.env[key]);
  }
}
