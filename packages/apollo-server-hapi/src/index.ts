// Expose types which can be used by both middleware flavors.
export { GraphQLOptions, gql } from 'apollo-server-core';
export {
  ApolloError,
  toApolloError,
  SyntaxError,
  ValidationError,
  AuthenticationError,
  ForbiddenError,
} from 'apollo-server-core';

export {
  IRegister,
  HapiOptionsFunction,
  HapiPluginOptions,
  graphqlHapi,
} from './hapiApollo';

// ApolloServer integration
export { ApolloServer, registerServer } from './ApolloServer';
