import "reflect-metadata"; // prerequisite for inversify

import { BindingScopeEnum, Container } from 'inversify';
import { IKeyDbService, KeyDbService, KEY_DB_SERVICE } from './services/key-db-service';
import { DbService, DB_SERVICE, IDbService } from './services/db-service';
import { IMessageDbService, MessageDbService, MESSAGE_DB_SERVICE } from './services/message-db-service';
import { IStartupService, StartupService, STARTUP_SERVICE } from './services/startup-service';
import { EventService, EVENT_SERVICE, IEventService } from './services/event-service';
import { EnvService, ENV_SERVICE, IEnvService } from './services/env-service';
import { ISignService, SignService, SIGN_SERVICE } from '@services/sign-service';
import { IKeyService, KeyService, KEY_SERVICE } from '@services/key-service';

const container: Container = new Container({ defaultScope: BindingScopeEnum.Singleton });

container.bind<IEnvService>(ENV_SERVICE).to(EnvService);
container.bind<IDbService>(DB_SERVICE).to(DbService);
container.bind<IKeyDbService>(KEY_DB_SERVICE).to(KeyDbService);
container.bind<IMessageDbService>(MESSAGE_DB_SERVICE).to(MessageDbService);
container.bind<IStartupService>(STARTUP_SERVICE).to(StartupService);
container.bind<IEventService>(EVENT_SERVICE).to(EventService);
container.bind<ISignService>(SIGN_SERVICE).to(SignService);
container.bind<IKeyService>(KEY_SERVICE).to(KeyService);

export { container };
