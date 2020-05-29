import { ApolloServer } from '../ApolloServer';
import { Config } from 'apollo-server-core';

import testSuite, {
  schema as Schema,
  CreateAppOptions,
} from 'apollo-server-integration-testsuite';

describe('integration:Hapi', () => {
  async function createApp(options: CreateAppOptions = {}) {
    const { Server } = require('hapi');

    const app: import('hapi').Server = new Server({
      host: 'localhost',
    });

    const server = new ApolloServer(
      (options.graphqlOptions as Config) || { schema: Schema },
    );
    await server.applyMiddleware({
      app,
    });

    await app.start();

    return app.listener;
  }

  async function destroyApp(app) {
    if (!app || !app.close) {
      return;
    }
    await new Promise(resolve => app.close(resolve));
  }

  testSuite(createApp, destroyApp);
});
