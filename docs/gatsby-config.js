const themeOptions = require('gatsby-theme-apollo-docs/theme-options');

module.exports = {
  pathPrefix: '/docs/apollo-server',
  plugins: [
    {
      resolve: 'gatsby-theme-apollo-docs',
      options: {
        ...themeOptions,
        root: __dirname,
        subtitle: 'Apollo Server',
        description: 'A guide to using Apollo Server',
        githubRepo: 'apollographql/apollo-server',
        defaultVersion: '2',
        // We build our docs including older versions which are synced from
        // GitHub at build time. If you want to be able to work on docs while
        // offline, set $OFFLINE and we won't include the old versions.
        versions: process.env.OFFLINE
          ? {}
          : {
              1: 'version-1',
            },
        sidebarCategories: {
          null: [
            'index',
            'getting-started',
            '[Changelog](https://github.com/apollographql/apollo-server/blob/main/CHANGELOG.md)',
            '[Apollo Federation](https://www.apollographql.com/docs/federation/)',
          ],
          'Defining a Schema': [
            'schema/schema',
            'schema/unions-interfaces',
            'schema/custom-scalars',
            'schema/directives',
          ],
          'Fetching Data': [
            'data/resolvers',
            'data/data-sources',
            'data/errors',
            'data/file-uploads',
            'data/subscriptions',
          ],
          Testing: [
            'testing/mocking',
            'testing/testing',
            '[Apollo Studio Explorer](https://www.apollographql.com/docs/studio/explorer/)',
            'testing/graphql-playground'
          ],
          Performance: ['performance/caching', 'performance/apq'],
          Security: ['security/authentication', 'security/terminating-ssl'],
          Integrations: [
            'integrations/middleware',
            'integrations/plugins',
          ],
          Deployment: [
            'deployment/heroku',
            'deployment/lambda',
            'deployment/netlify',
            'deployment/azure-functions',
            'deployment/gcp-functions'
          ],
          Monitoring: ['monitoring/metrics', 'monitoring/health-checks'],
          'API Reference': [
            'api/apollo-server',
            'api/plugin/usage-reporting',
            'api/plugin/schema-reporting',
            'api/plugin/inline-trace',
            '[@apollo/federation](https://www.apollographql.com/docs/federation/api/apollo-federation/)',
            '[@apollo/gateway](https://www.apollographql.com/docs/federation/api/apollo-gateway/)',
          ],
          Appendices: [
            'proxy-configuration',
            'migration',
            'migration-file-uploads',
            'migration-engine-plugins',
          ],
        },
      },
    },
  ],
};
