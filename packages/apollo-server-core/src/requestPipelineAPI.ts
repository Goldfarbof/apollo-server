// This file is compiled as a separate TypeScript project to avoid
// circular dependency issues from the `apollo-server-plugin-base` package
// depending on the types in it.

import { Request, Headers } from 'apollo-server-env';
import { ValidationContext, ASTVisitor, GraphQLError } from 'graphql';
import { KeyValueCache } from 'apollo-server-caching';

export interface GraphQLRequest {
  query?: string;
  operationName?: string;
  variables?: { [name: string]: any };
  extensions?: Record<string, any>;
  http: Pick<Request, 'url' | 'method' | 'headers'>;
}

export interface GraphQLResponse {
  data?: object;
  errors?: GraphQLError[];
  extensions?: Record<string, any>;
  http?: {
    headers: Headers;
  };
}

export interface GraphQLRequestContext<TContext> {
  request: GraphQLRequest;
  response?: GraphQLResponse;

  context: TContext;
  cache: KeyValueCache;

  debug?: boolean;
}

export type ValidationRule = (context: ValidationContext) => ASTVisitor;

export class InvalidGraphQLRequestError extends Error {}
