import type { Handler } from 'aws-lambda';
import {
  ApolloServer as ApolloServerExpress,
  GetMiddlewareOptions,
} from 'apollo-server-express';
import type { GraphQLOptions } from 'apollo-server-core';
import express from 'express';
import serverlessExpress, {
  getCurrentInvoke,
} from '@vendia/serverless-express';

export interface CreateHandlerOptions {
  expressAppFromMiddleware?: (
    middleware: express.RequestHandler,
  ) => express.Application;
  expressGetMiddlewareOptions?: GetMiddlewareOptions;
}

function defaultExpressAppFromMiddleware(
  middleware: express.RequestHandler,
): express.Application {
  const app = express();
  app.use(middleware);
  return app;
}
export class ApolloServer extends ApolloServerExpress {
  protected serverlessFramework(): boolean {
    return true;
  }

  public createHandler<TEvent = any, TResult = any>(
    options?: CreateHandlerOptions,
  ): Handler<TEvent, TResult> {
    let realHandler: Handler<TEvent, TResult>;
    return async (...args) => {
      await this.ensureStarted();
      if (!realHandler) {
        const middleware = this.getMiddleware(
          options?.expressGetMiddlewareOptions,
        );
        const app = (
          options?.expressAppFromMiddleware ?? defaultExpressAppFromMiddleware
        )(middleware);
        realHandler = serverlessExpress({ app });
      }
      return (await realHandler(...args)) as TResult;
    };
  }

  // This method is called by apollo-server-express with the request and
  // response. It fetches the Lambda context as well (from a global variable,
  // which is safe because the Lambda runtime doesn't invoke multiple operations
  // concurrently).
  async createGraphQLServerOptions(
    req: express.Request,
    res: express.Response,
  ): Promise<GraphQLOptions> {
    const { event, context } = getCurrentInvoke();
    return super.graphQLServerOptions({
      express: { req, res },
      lambda: { event, context },
    });
  }
}
