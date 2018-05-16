/* tslint:disable:no-unused-expression */
import { expect } from 'chai';
import { stub, spy } from 'sinon';
import 'mocha';

import {
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLString,
  GraphQLInt,
  GraphQLError,
} from 'graphql';

import {
  ApolloError,
  formatApolloErrors,
  AuthenticationError,
  ForbiddenError,
  ValidationError,
  SyntaxError,
} from './errors';

const queryType = new GraphQLObjectType({
  name: 'QueryType',
  fields: {
    testString: {
      type: GraphQLString,
      resolve() {
        return 'it works';
      },
    },
  },
});

const schema = new GraphQLSchema({
  query: queryType,
});

describe('Errors', () => {
  describe('ApolloError', () => {
    const message = 'message';
    it('defaults code to INTERNAL_SERVER_ERROR', () => {
      const error = new ApolloError(message);
      expect(error.message).to.equal(message);
      expect(error.extensions.code).not.to.exist;
    });
    it('allows code setting and additional properties', () => {
      const code = 'CODE';
      const key = 'key';
      const error = new ApolloError(message, code, { key });
      expect(error.message).to.equal(message);
      expect(error.key).to.equal(key);
      expect(error.extensions.code).to.equal(code);
    });
  });

  describe('formatApolloErrors', () => {
    type CreateFormatError =
      | ((options: Record<string, any>, errors) => Record<string, any>[])
      | ((options?: Record<string, any>) => Record<string, any>);
    const message = 'message';
    const code = 'CODE';
    const key = 'key';

    const createFromttedError: CreateFormatError = (
      options,
      errors?: Error[],
    ) => {
      if (errors === undefined) {
        const error = new ApolloError(message, code, { key });
        return formatApolloErrors(
          [
            new GraphQLError(
              error.message,
              undefined,
              undefined,
              undefined,
              undefined,
              error,
            ),
          ],
          options,
        )[0];
      } else {
        return formatApolloErrors(errors, options);
      }
    };

    it('exposes a stacktrace in debug mode', () => {
      const error = createFromttedError({ debug: true });
      expect(error.message).to.equal(message);
      expect(error.extensions.exception.key).to.equal(key);
      expect(error.extensions.code).to.equal(code);
      expect(
        error.extensions.exception.stacktrace,
        'stacktrace should exist under exception',
      ).to.exist;
    });
    it('hides stacktrace by default', () => {
      const thrown = new Error(message);
      (thrown as any).key = key;
      const error = formatApolloErrors([
        new GraphQLError(
          thrown.message,
          undefined,
          undefined,
          undefined,
          undefined,
          thrown,
        ),
      ])[0];
      expect(error.message).to.equal(message);
      expect(error.extensions.code).to.equal('INTERNAL_SERVER_ERROR');
      expect(error.extensions.exception.key).to.equal(key);
      expect(
        error.extensions.exception.stacktrace,
        'stacktrace should exist under exception',
      ).not.to.exist;
    });
    it('exposes fields on error under exception field and provides code', () => {
      const error = createFromttedError();
      expect(error.message).to.equal(message);
      expect(error.extensions.exception.key).to.equal(key);
      expect(error.extensions.code).to.equal(code);
      expect(
        error.extensions.exception.stacktrace,
        'stacktrace should exist under exception',
      ).not.to.exist;
    });
    it('calls logFunction with each error', () => {
      const error = new ApolloError(message, code, { key });
      const logFunction = stub();
      const formattedError = formatApolloErrors([error], {
        logFunction,
        debug: true,
      });
      expect(error.message).to.equal(message);
      expect(error.key).to.equal(key);
      expect(error.extensions.code).to.equal(code);
      expect(logFunction.calledOnce);
    });
    it('calls formatter after exposing the code and stacktrace', () => {
      const error = new ApolloError(message, code, { key });
      const formatter = stub();
      const formattedError = formatApolloErrors([error], {
        formatter,
        debug: true,
      });
      expect(error.message).to.equal(message);
      expect(error.key).to.equal(key);
      expect(error.extensions.code).to.equal(code);
      expect(formatter.calledOnce);
    });
  });
  describe('Named Errors', () => {
    const message = 'message';
    function verifyError(error, code) {
      expect(error.message).to.equal(message);
      expect(error.extensions.code).to.equal(code);
    }

    it('provides an authentication error', () => {
      verifyError(new AuthenticationError(message), 'UNAUTHENTICATED');
    });
    it('provides a forbidden error', () => {
      verifyError(new ForbiddenError(message), 'FORBIDDEN');
    });
    it('provides a syntax error', () => {
      verifyError(new SyntaxError(message), 'GRAPHQL_PARSE_FAILED');
    });
    it('provides a validation error', () => {
      verifyError(new ValidationError(message), 'GRAPHQL_VALIDATION_FAILED');
    });
  });
});
