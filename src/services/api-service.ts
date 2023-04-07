import axios from 'axios';
import { inject, injectable } from 'inversify';
import { UnsignedMessageIdsReply, UnsignedMessageIdsRequest } from 'src/types';
import { ENV_SERVICE, IEnvService } from './env-service';
import { Urls } from '@lambdas/*';

export const API_SERVICE = Symbol('ApiService');
export interface IApiService {
  unsignedMessageIds(request: UnsignedMessageIdsRequest): Promise<UnsignedMessageIdsReply>;
}

axios.defaults.timeout = 1000 * 60 * 5;

@injectable()
export class ApiService implements IApiService {
  constructor(@inject(ENV_SERVICE) private _env: IEnvService) {}

  url(path: string) {
    return `${this._env.apiUrl}/${path}`;
  }

  async unsignedMessageIds(request: UnsignedMessageIdsRequest): Promise<UnsignedMessageIdsReply> {
    const { data } = await axios.get<UnsignedMessageIdsReply>(this.url(Urls.unsignedMessageIds), { params: request });
    return data;
  }
}
