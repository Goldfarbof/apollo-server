import gql from 'graphql-tag';
import deepFreeze from 'deep-freeze';
import {
  defaultRootOperationTypes,
  stripExternalFieldsFromTypeDefs,
} from '../utils';
import { astSerializer } from '../../snapshotSerializers';

expect.addSnapshotSerializer(astSerializer);

describe('Composition utility functions', () => {
  describe('defaultRootOperationTypes', () => {
    it('transforms defined root operation types to respective extended default root operation types', () => {
      const typeDefs = gql`
        schema {
          query: RootQuery
          mutation: RootMutation
        }

        type RootQuery {
          product: Product
        }

        type Product {
          sku: String
        }

        type RootMutation {
          updateProduct: Product
        }
      `;

      const schemaWithDefaultedRootOperationTypes = defaultRootOperationTypes(
        typeDefs,
      );
      expect(schemaWithDefaultedRootOperationTypes).toMatchInlineSnapshot(`
        extend type Query {
          product: Product
        }

        type Product {
          sku: String
        }

        extend type Mutation {
          updateProduct: Product
        }
      `);
    });

    it('removes all types using a default root operation type name when a schema definition is provided (root types are defined by the user)', () => {
      const typeDefs = gql`
        schema {
          query: RootQuery
        }

        type RootQuery {
          product: Product
        }

        type Product {
          sku: String
        }

        type Query {
          removeThisEntireType: String
        }

        type Mutation {
          removeThisEntireType: String
        }

        type Subscription {
          removeThisEntireType: String
        }
      `;

      const schemaWithDefaultedRootOperationTypes = defaultRootOperationTypes(
        typeDefs,
      );
      expect(schemaWithDefaultedRootOperationTypes).toMatchInlineSnapshot(`
        extend type Query {
          product: Product
        }

        type Product {
          sku: String
        }
      `);
    });

    it('drops fields that reference an invalid default root operation type name', () => {
      const typeDefs = gql`
        schema {
          query: RootQuery
          mutation: RootMutation
        }

        type RootQuery {
          product: Product
        }

        type Query {
          removeThisEntireType: String
        }

        type RootMutation {
          keepThisField: String
          removeThisField: Query
        }
      `;

      const schemaWithDefaultedRootOperationTypes = defaultRootOperationTypes(
        typeDefs,
      );
      expect(schemaWithDefaultedRootOperationTypes).toMatchInlineSnapshot(`
        extend type Query {
          product: Product
        }

        extend type Mutation {
          keepThisField: String
        }
      `);
    });
  });

  describe('stripExternalFieldsFromTypeDefs', () => {
    it('returns a new DocumentNode with @external fields removed as well as information about the removed fields', () => {
      const typeDefs = gql`
        type Query {
          product: Product
        }

        extend type Product @key(fields: "sku") {
          sku: String @external
        }

        type Mutation {
          updateProduct: Product
        }
      `;

      const {
        typeDefsWithoutExternalFields,
        strippedFields,
      } = stripExternalFieldsFromTypeDefs(typeDefs, 'serviceA');

      expect(typeDefsWithoutExternalFields).toMatchInlineSnapshot(`
        type Query {
          product: Product
        }

        extend type Product @key(fields: "sku")

        type Mutation {
          updateProduct: Product
        }
      `);

      expect(strippedFields).toMatchInlineSnapshot(`
                Array [
                  Object {
                    "field": sku: String @external,
                    "parentTypeName": "Product",
                    "serviceName": "serviceA",
                  },
                ]
            `);
    });

    it("doesn't mutate the input DocumentNode", () => {
      const typeDefs = gql`
        type Query {
          product: Product
        }

        extend type Product @key(fields: "sku") {
          sku: String @external
        }

        type Mutation {
          updateProduct: Product
        }
      `;

      deepFreeze(typeDefs);

      // Assert that mutation does, in fact, throw
      expect(() => (typeDefs.blah = [])).toThrow();
      expect(() =>
        stripExternalFieldsFromTypeDefs(typeDefs, 'serviceA'),
      ).not.toThrow();
    });
  });
});
