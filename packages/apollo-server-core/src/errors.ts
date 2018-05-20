import { GraphQLError } from 'graphql';
import { LogStep, LogAction, LogMessage, LogFunction } from './logging';

export class ApolloError extends Error {
  public extensions;
  [key: string]: any;

  constructor(
    message: string,
    code?: string,
    properties?: Record<string, any>,
  ) {
    super(message);

    // Set the prototype explicitly.
    // https://stackoverflow.com/a/41102306
    Object.setPrototypeOf(this, ApolloError.prototype);

    if (properties) {
      Object.keys(properties).forEach(key => {
        this[key] = properties[key];
      });
    }

    //extensions are flattened to be included in the root of GraphQLError's, so
    //don't add properties to extensions
    this.extensions = { code };
  }
}

function enrichError(error: GraphQLError, debug: boolean = false) {
  const expanded: ApolloError = {
    message: error.message,
    path: error.path,
    locations: error.locations,
    ...error,
    extensions: {
      ...error.extensions,
      code:
        (error.extensions && error.extensions.code) || 'INTERNAL_SERVER_ERROR',
      exception: {
        ...(error.extensions && error.extensions.exception),
        ...(error.originalError as any),
      },
    },
  };

  //ensure that extensions is not taken from the originalError
  //graphql-js ensures that the originalError's extensions are hoisted
  //https://github.com/graphql/graphql-js/blob/0bb47b2/src/error/GraphQLError.js#L138
  delete expanded.extensions.exception.extensions;
  if (debug && !expanded.extensions.exception.stacktrace) {
    expanded.extensions.exception.stacktrace =
      (error.originalError &&
        error.originalError.stack &&
        error.originalError.stack.split('\n')) ||
      (error.stack && error.stack.split('\n'));
  }

  if (Object.keys(expanded.extensions.exception).length === 0) {
    //remove from printing an empty object
    delete expanded.extensions.exception;
  }

  return expanded;
}

export function toApolloError(
  error: Error,
  code: string = 'INTERNAL_SERVER_ERROR',
): Error & { extensions: Record<string, any> } {
  let err: GraphQLError = error;
  if (err.extensions) {
    err.extensions.code = code;
  } else {
    err.extensions = { code };
  }
  return err as Error & { extensions: Record<string, any> };
}

export interface ErrorOptions {
  code?: string;
  errorClass?: typeof ApolloError;
}

export function fromGraphQLError(error: GraphQLError, options?: ErrorOptions) {
  const copy: GraphQLError =
    options && options.errorClass
      ? new options.errorClass(error.message)
      : new ApolloError(error.message);

  //copy enumerable keys
  Object.keys(error).forEach(key => {
    copy[key] = error[key];
  });

  //extensions are non enumerable, so copy them directly
  copy.extensions = {
    ...copy.extensions,
    ...error.extensions,
  };

  //Fallback on default for code
  if (!copy.extensions.code) {
    copy.extensions.code = (options && options.code) || 'INTERNAL_SERVER_ERROR';
  }

  //copy the original error, while keeping all values non-enumerable, so they
  //are not printed unless directly referenced
  Object.defineProperty(copy, 'originalError', { value: {} });
  Object.getOwnPropertyNames(error).forEach(key => {
    Object.defineProperty(copy.originalError, key, { value: error[key] });
  });

  return copy;
}

export class SyntaxError extends ApolloError {
  constructor(message: string) {
    super(message, 'GRAPHQL_PARSE_FAILED');

    // Set the prototype explicitly.
    // https://stackoverflow.com/a/41102306
    Object.setPrototypeOf(this, SyntaxError.prototype);
    Object.defineProperty(this, 'name', { value: 'SyntaxError' });
  }
}

export class ValidationError extends ApolloError {
  constructor(message: string) {
    super(message, 'GRAPHQL_VALIDATION_FAILED');

    // Set the prototype explicitly.
    // https://stackoverflow.com/a/41102306
    Object.setPrototypeOf(this, ValidationError.prototype);
    Object.defineProperty(this, 'name', { value: 'ValidationError' });
  }
}

export class AuthenticationError extends ApolloError {
  constructor(message: string) {
    super(message, 'UNAUTHENTICATED');

    // Set the prototype explicitly.
    // https://stackoverflow.com/a/41102306
    Object.setPrototypeOf(this, AuthenticationError.prototype);
    Object.defineProperty(this, 'name', { value: 'AuthenticationError' });
  }
}

export class ForbiddenError extends ApolloError {
  constructor(message: string) {
    super(message, 'FORBIDDEN');

    // Set the prototype explicitly.
    // https://stackoverflow.com/a/41102306
    Object.setPrototypeOf(this, ForbiddenError.prototype);
    Object.defineProperty(this, 'name', { value: 'ForbiddenError' });
  }
}

export function formatApolloErrors(
  errors: Array<Error>,
  options?: {
    formatter?: Function;
    logFunction?: LogFunction;
    debug?: boolean;
  },
): Array<ApolloError> {
  if (!options) {
    return errors.map(error => enrichError(error));
  }
  const { formatter, debug, logFunction } = options;

  const enrichedErrors = errors.map(error => enrichError(error, debug));

  if (!formatter) {
    return enrichedErrors;
  }

  return enrichedErrors.map(error => {
    try {
      return formatter(error);
    } catch (err) {
      logFunction({
        action: LogAction.cleanup,
        step: LogStep.status,
        data: err,
        key: 'error',
      });

      if (debug) {
        return enrichError(err, debug);
      } else {
        //obscure error
        const newError: GraphQLError = fromGraphQLError(
          new GraphQLError('Internal server error'),
        );
        return enrichError(newError, debug);
      }
    }
  }) as Array<ApolloError>;
}
