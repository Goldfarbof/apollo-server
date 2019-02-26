# GraphQL Server for Express, Connect, Hapi, Cloudflare workers, and more

[![npm version](https://badge.fury.io/js/apollo-server-core.svg)](https://badge.fury.io/js/apollo-server-core)
[![Build Status](https://circleci.com/gh/apollographql/apollo-server.svg?style=svg)](https://circleci.com/gh/apollographql/apollo-server)
[![Join the community on Spectrum](https://withspectrum.github.io/badge/badge.svg)](https://spectrum.chat/apollo)


Apollo Server is a community-maintained open-source GraphQL server. It works with pretty much all Node.js HTTP server frameworks, and we're happy to take PRs for more! Apollo Server works with any GraphQL schema built with [GraphQL.js](https://github.com/graphql/graphql-js), so you can build your schema with that directly or with a convenience library such as [graphql-tools](https://www.apollographql.com/docs/graphql-tools/).

## Documentation

[Read the docs!](https://www.apollographql.com/docs/apollo-server/v2)

## Principles

Apollo Server is built with the following principles in mind:

- **By the community, for the community**: Apollo Server's development is driven by the needs of developers
- **Simplicity**: by keeping things simple, Apollo Server is easier to use, easier to contribute to, and more secure
- **Performance**: Apollo Server is well-tested and production-ready - no modifications needed

Anyone is welcome to contribute to Apollo Server, just read [CONTRIBUTING.md](./CONTRIBUTING.md), take a look at the [roadmap](./ROADMAP.md) and make your first PR!

## Getting started

Apollo Server is super easy to set up. Just `npm install apollo-server-<integration>`, write a GraphQL schema, and then use one of the following snippets to get started. For more info, read the [Apollo Server docs](https://www.apollographql.com/docs/apollo-server/v2).

There are two installation patterns:

* **[Standalone](#Installation-standalone)**: To get started without integrating with an existing web framework, use the `apollo-server` package.
* **[Integrations](#Installation-integrations)**: For applications which have already use a web framework (e.g. `express`, `koa`, `hapi`, etc.), use the appropriate Apollo Server integration package.

### Installation: Standalone

In a new project, install the `apollo-server` and `graphql` dependencies using:

    npm install apollo-server graphql

Then, create an `index.js` which defines the schema and its functionality (i.e. resolvers):

```js
const { ApolloServer, gql } = require('apollo-server');

// The GraphQL schema
const typeDefs = gql`
  type Query {
    "A simple type for getting started!"
    hello: String
  }
`;

// A map of functions which return data for the schema.
const resolvers = {
  Query: {
    hello: () => 'world',
  },
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
});

server.listen().then(({ url }) => {
  console.log(`🚀 Server ready at ${url}`);
});
```

> Due to its human-readability, we recommend using [schema-definition language (SDL)](https://www.apollographql.com/docs/apollo-server/essentials/schema.html#sdl) to define a GraphQL schema but [a `GraphQLSchema` object from `graphql-js`](https://github.com/graphql/graphql-js/#using-graphqljs) can also be specified in place of `typeDefs` and `resolvers` using the `schema` property:
>
> ```js
> const server = new ApolloServer({
>   schema: ...
> });
> ```

Finally, start the server using `node index.js` and open your web-browser to the URL which is output on the console.

For more details, check out the Apollo Server [Getting Started guide](https://www.apollographql.com/docs/apollo-server/getting-started.html) of the documentation, or for a more comprehensive understanding, see the [fullstack tutorial](https://www.apollographql.com/docs/tutorial/introduction.html).

For questions, the [Apollo commuinty on Spectrum.chat](https://spectrum.chat) is a great place to get assistance.

## Installation: Integrations

While the standalone installation above can be used without making a decision about which web framework to use, the Apollo Server integration packages are paired with specific web frameworks (e.g. Express, Koa, hapi).

The following web frameworks have Apollo Server integrations, and each of these linked integrations has its own installation instructions and examples on its package `README.md`:

- [Express](https://github.com/apollographql/apollo-server/tree/master/packages/apollo-server-express) _(Most popular)_
- [Koa](https://github.com/apollographql/apollo-server/tree/master/packages/apollo-server-koa)
- [Hapi](https://github.com/apollographql/apollo-server/tree/master/packages/apollo-server-hapi)
- [Fastify](https://github.com/apollographql/apollo-server/tree/master/packages/apollo-server-fastify)
- [Amazon Lambda](https://github.com/apollographql/apollo-server/tree/master/packages/apollo-server-lambda)
- [Micro](https://github.com/apollographql/apollo-server/tree/master/packages/apollo-server-micro)
- [Azure Functions](https://github.com/apollographql/apollo-server/tree/master/packages/apollo-server-azure-functions)
- [Google Cloud Functions](https://github.com/apollographql/apollo-server/tree/master/packages/apollo-server-cloud-functions)

See the links above for more details on a specific integration.

## Context

The context is created for each request. The following code snippet shows the creation of a context. The arguments are the `request`, the request, and `h`, the response toolkit.

```js
new ApolloServer({
  typeDefs,
  resolvers,
  context: async ({ request, h }) => {
    return { ... };
  },
})
```

## Apollo Server Development

If you want to develop Apollo Server locally you must follow the following instructions:

- Fork this repository

- Install the Apollo Server project in your computer

```
git clone https://github.com/[your-user]/apollo-server
cd apollo-server
npm install
cd packages/apollo-server-<integration>/
npm link
```

- Install your local Apollo Server in other App

```
cd ~/myApp
npm link apollo-server-<integration>
```

## Maintainers

- [@martijnwalraven](https://github.com/martijnwalraven) (Apollo)
- [@abernix](https://github.com/abernix) (Apollo)
