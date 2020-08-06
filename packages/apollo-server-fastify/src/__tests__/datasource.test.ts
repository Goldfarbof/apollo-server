import fastify, { FastifyInstance } from 'fastify';

import { RESTDataSource } from 'apollo-datasource-rest';

import { createApolloFetch } from 'apollo-fetch';
import { ApolloServer } from '../ApolloServer';

import { createServerInfo } from 'apollo-server-integration-testsuite';
import { gql } from '../index';

const restPort = 4003;
const gqlPort = 4004;

export class IdAPI extends RESTDataSource {
  baseURL = `http://localhost:${restPort}/`;

  async getId(id: string) {
    return this.get(`id/${id}`);
  }

  async getStringId(id: string) {
    return this.get(`str/${id}`);
  }
}

const typeDefs = gql`
  type Query {
    id: String
    stringId: String
  }
`;

const resolvers = {
  Query: {
    id: async (_source, _args, { dataSources }) => {
      return (await dataSources.id.getId('hi')).id;
    },
    stringId: async (_source, _args, { dataSources }) => {
      return dataSources.id.getStringId('hi');
    },
  },
};

let restCalls = 0;
const restAPI = fastify();

restAPI.get<any>('/id/:id', (request, reply) => {
  const id = request.params.id;
  restCalls++;
  reply.header('Content-Type', 'application/json');
  reply.header('Cache-Control', 'max-age=2000, public');
  reply.send({ id });
});

restAPI.get<any>('/str/:id', (request, reply) => {
  const id = request.params.id;
  restCalls++;
  reply.header('Content-Type', 'text/plain');
  reply.header('Cache-Control', 'max-age=2000, public');
  reply.send(id);
});

describe('apollo-server-fastify', () => {
  let restServer: FastifyInstance;
  let app: FastifyInstance;

  beforeAll(async () => {
    await restAPI.listen(restPort);
  });

  afterAll(async () => {
    await new Promise(resolve => restServer.close(() => resolve()));
  });

  let server: ApolloServer;

  beforeEach(() => {
    restCalls = 0;
  });

  afterEach(async () => {
    await server.stop();
    await new Promise(resolve => app.close(() => resolve()));
  });

  it('uses the cache', async () => {
    server = new ApolloServer({
      typeDefs,
      resolvers,
      dataSources: () => ({
        id: new IdAPI(),
      }),
    });
    app = fastify();

    app.register(server.createHandler());
    await app.listen(gqlPort);
    const { url: uri } = createServerInfo(server, app.server);

    const apolloFetch = createApolloFetch({ uri });
    const firstResult = await apolloFetch({ query: '{ id }' });

    expect(firstResult.data).toEqual({ id: 'hi' });
    expect(firstResult.errors).toBeUndefined();
    expect(restCalls).toEqual(1);

    const secondResult = await apolloFetch({ query: '{ id }' });

    expect(secondResult.data).toEqual({ id: 'hi' });
    expect(secondResult.errors).toBeUndefined();
    expect(restCalls).toEqual(1);
  });

  it('can cache a string from the backend', async () => {
    server = new ApolloServer({
      typeDefs,
      resolvers,
      dataSources: () => ({
        id: new IdAPI(),
      }),
    });
    app = fastify();

    app.register(server.createHandler());
    await app.listen(gqlPort);
    const { url: uri } = createServerInfo(server, app.server);

    const apolloFetch = createApolloFetch({ uri });
    const firstResult = await apolloFetch({ query: '{ id: stringId }' });

    expect(firstResult.data).toEqual({ id: 'hi' });
    expect(firstResult.errors).toBeUndefined();
    expect(restCalls).toEqual(1);

    const secondResult = await apolloFetch({ query: '{ id: stringId }' });

    expect(secondResult.data).toEqual({ id: 'hi' });
    expect(secondResult.errors).toBeUndefined();
    expect(restCalls).toEqual(1);
  });
});
