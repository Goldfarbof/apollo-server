import { parse, DocumentNode, ExecutionResult } from 'graphql';
import { runQuery, QueryOptions } from './runQuery';
import {
  default as GraphQLOptions,
  resolveGraphqlOptions,
} from './graphqlOptions';
import { formatApolloErrors } from './errors';

export interface HttpQueryRequest {
  method: string;
  // query is either the POST body or the GET query string map.  In the GET
  // case, all values are strings and need to be parsed as JSON; in the POST
  // case they should already be parsed. query has keys like 'query' (whose
  // value should always be a string), 'variables', 'operationName',
  // 'extensions', etc.
  query: Record<string, any> | Array<Record<string, any>>;
  options:
    | GraphQLOptions
    | ((...args: Array<any>) => Promise<GraphQLOptions> | GraphQLOptions);
  request: Request;
}

export class HttpQueryError extends Error {
  public statusCode: number;
  public isGraphQLError: boolean;
  public headers: { [key: string]: string };

  constructor(
    statusCode: number,
    message: string,
    isGraphQLError: boolean = false,
    headers?: { [key: string]: string },
  ) {
    super(message);
    this.name = 'HttpQueryError';
    this.statusCode = statusCode;
    this.isGraphQLError = isGraphQLError;
    this.headers = headers;
  }
}

export async function runHttpQuery(
  handlerArguments: Array<any>,
  request: HttpQueryRequest,
): Promise<string> {
  let isGetRequest: boolean = false;
  let optionsObject: GraphQLOptions;
  const debugDefault =
    process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test';

  try {
    optionsObject = await resolveGraphqlOptions(
      request.options,
      ...handlerArguments,
    );
  } catch (e) {
    // The options can be generated asynchronously, so we don't have access to
    // the normal options provided by the user, such as: formatError,
    // logFunction, debug. Therefore, we need to do some unnatural things, such
    // as use NODE_ENV to determine the debug settings
    e.message = `Invalid options provided to ApolloServer: ${e.message}`;
    if (!debugDefault) {
      e.warning = `To remove the stacktrace, set the NODE_ENV environment variable to production if the options creation can fail`;
    }
    throw new HttpQueryError(
      500,
      JSON.stringify({
        errors: formatApolloErrors([e], { debug: debugDefault }),
      }),
      true,
      {
        'Content-Type': 'application/json',
      },
    );
  }
  const debug =
    optionsObject.debug !== undefined ? optionsObject.debug : debugDefault;
  let requestPayload;

  switch (request.method) {
    case 'POST':
      if (!request.query || Object.keys(request.query).length === 0) {
        throw new HttpQueryError(
          500,
          'POST body missing. Did you forget use body-parser middleware?',
        );
      }

      requestPayload = request.query;
      break;
    case 'GET':
      if (!request.query || Object.keys(request.query).length === 0) {
        throw new HttpQueryError(400, 'GET query missing.');
      }

      isGetRequest = true;
      requestPayload = request.query;
      break;

    default:
      throw new HttpQueryError(
        405,
        'Apollo Server supports only GET/POST requests.',
        false,
        {
          Allow: 'GET, POST',
        },
      );
  }

  let isBatch = true;
  // TODO: do something different here if the body is an array.
  // Throw an error if body isn't either array or object.
  if (!Array.isArray(requestPayload)) {
    isBatch = false;
    requestPayload = [requestPayload];
  }

  const requests = requestPayload.map(async requestParams => {
    try {
      const queryString: string | undefined = requestParams.query;
      let extensions = requestParams.extensions;

      if (isGetRequest && extensions) {
        // For GET requests, we have to JSON-parse extensions. (For POST
        // requests they get parsed as part of parsing the larger body they're
        // inside.)
        try {
          extensions = JSON.parse(extensions);
        } catch (error) {
          throw new HttpQueryError(400, 'Extensions are invalid JSON.');
        }
      }

      if (
        queryString === undefined &&
        extensions &&
        extensions.persistedQuery
      ) {
        // It looks like we've received an Apollo Persisted Query. Apollo Server
        // does not support persisted queries out of the box, so we should fail
        // fast with a clear error saying that we don't support APQs. (A future
        // version of Apollo Server may support APQs directly.)
        throw new HttpQueryError(
          // Return 200 to simplify processing: we want this to be intepreted by
          // the client as data worth interpreting, not an error.
          200,
          JSON.stringify({
            errors: [
              {
                message: 'PersistedQueryNotSupported',
              },
            ],
          }),
          true,
          {
            'Content-Type': 'application/json',
          },
        );
      }

      //We ensure that there is a queryString or parsedQuery after formatParams
      if (queryString && typeof queryString !== 'string') {
        // Check for a common error first.
        if (queryString && (queryString as any).kind === 'Document') {
          throw new HttpQueryError(
            400,
            "GraphQL queries must be strings. It looks like you're sending the " +
              'internal graphql-js representation of a parsed query in your ' +
              'request instead of a request in the GraphQL query language. You ' +
              'can convert an AST to a string using the `print` function from ' +
              '`graphql`, or use a client like `apollo-client` which converts ' +
              'the internal representation to a string for you.',
          );
        }
        throw new HttpQueryError(400, 'GraphQL queries must be strings.');
      }

      // GET operations should only be queries (not mutations). We want to throw
      // a particular HTTP error in that case, but we don't actually parse the
      // query until we're in runQuery, so we declare the error we want to throw
      // here and pass it into runQuery.
      // TODO this could/should be added as a validation rule rather than an ad hoc error
      let nonQueryError;
      if (isGetRequest) {
        nonQueryError = new HttpQueryError(
          405,
          `GET supports only query operation`,
          false,
          {
            Allow: 'POST',
          },
        );
      }

      const operationName = requestParams.operationName;

      let variables = requestParams.variables;
      if (typeof variables === 'string') {
        try {
          // XXX Really we should only do this for GET requests, but for
          // compatibility reasons we'll keep doing this at least for now for
          // broken clients that ship variables in a string for no good reason.
          variables = JSON.parse(variables);
        } catch (error) {
          throw new HttpQueryError(400, 'Variables are invalid JSON.');
        }
      }

      let context = optionsObject.context;
      if (!context) {
        //appease typescript compiler, otherwise could use || {}
        context = {};
      } else if (typeof context === 'function') {
        try {
          context = await context();
        } catch (e) {
          e.message = `Context creation failed: ${e.message}`;
          throw new HttpQueryError(
            500,
            JSON.stringify({
              errors: formatApolloErrors([e], {
                formatter: optionsObject.formatError,
                debug,
                logFunction: optionsObject.logFunction,
              }),
            }),
            true,
            {
              'Content-Type': 'application/json',
            },
          );
        }
      } else if (isBatch) {
        context = Object.assign(
          Object.create(Object.getPrototypeOf(context)),
          context,
        );
      }

      let params: QueryOptions = {
        schema: optionsObject.schema,
        queryString,
        nonQueryError,
        variables: variables,
        context,
        rootValue: optionsObject.rootValue,
        operationName: operationName,
        logFunction: optionsObject.logFunction,
        validationRules: optionsObject.validationRules,
        formatError: optionsObject.formatError,
        formatResponse: optionsObject.formatResponse,
        fieldResolver: optionsObject.fieldResolver,
        debug: optionsObject.debug,
        tracing: optionsObject.tracing,
        cacheControl: optionsObject.cacheControl,
        request: request.request,
      };

      if (optionsObject.formatParams) {
        params = optionsObject.formatParams(params);
      }

      if (!params.queryString && !params.parsedQuery) {
        // Note that we've already thrown a different error if it looks like APQ.
        throw new HttpQueryError(400, 'Must provide query string.');
      }

      return runQuery(params);
    } catch (e) {
      // Populate any HttpQueryError to our handler which should
      // convert it to Http Error.
      if (e.name === 'HttpQueryError') {
        //async function wraps this in a Promise
        throw e;
      }

      return {
        errors: formatApolloErrors([e], {
          formatter: optionsObject.formatError,
          debug,
          logFunction: optionsObject.logFunction,
        }),
      };
    }
  }) as Array<Promise<ExecutionResult>>;

  const responses = await Promise.all(requests);

  if (!isBatch) {
    const gqlResponse = responses[0];
    //This code is run on parse/validation errors and any other error that
    //doesn't reach GraphQL execution
    if (gqlResponse.errors && typeof gqlResponse.data === 'undefined') {
      throw new HttpQueryError(400, JSON.stringify(gqlResponse), true, {
        'Content-Type': 'application/json',
      });
    }
    return JSON.stringify(gqlResponse);
  }

  return JSON.stringify(responses);
}
