import {
  FieldNode,
  getNamedType,
  GraphQLCompositeType,
  GraphQLField,
  isCompositeType,
  Kind,
  SelectionNode,
  SelectionSetNode,
  GraphQLObjectType,
} from 'graphql';
import { getResponseName } from './utilities/graphql';

export interface Field<
  TParent extends GraphQLCompositeType = GraphQLCompositeType
> {
  scope: Scope<TParent>;
  fieldNode: FieldNode;
  fieldDef: GraphQLField<any, any>;
}

export interface Scope<TParent extends GraphQLCompositeType> {
  parentType: TParent;
  possibleTypes: ReadonlyArray<GraphQLObjectType>;
  enclosingScope?: Scope<GraphQLCompositeType>;
}

export type FieldSet = Field[];

export function printFields(fields?: FieldSet) {
  if (!fields) return '[]';
  return (
    '[' +
    fields
      .map(field => `"${field.scope.parentType.name}.${field.fieldDef.name}"`)
      .join(', ') +
    ']'
  );
}

export function matchesField(field: Field) {
  // TODO: Compare parent type and arguments
  return (otherField: Field) => {
    return field.fieldDef.name === otherField.fieldDef.name;
  };
}

function groupBy<T, U>(keyFunction: (element: T) => U) {
  return (iterable: Iterable<T>) => {
    const result = new Map<U, T[]>();

    for (const element of iterable) {
      const key = keyFunction(element);
      const group = result.get(key);

      if (group) {
        group.push(element);
      } else {
        result.set(key, [element]);
      }
    }

    return result;
  };
}

export const groupByResponseName = groupBy<Field, string>(field =>
  getResponseName(field.fieldNode)
);

export const groupByParentType = groupBy<Field, GraphQLCompositeType>(
  field => field.scope.parentType,
);

export function selectionSetFromFieldSet(
  fields: FieldSet,
  parentType?: GraphQLCompositeType,
): SelectionSetNode {
  return {
    kind: Kind.SELECTION_SET,
    selections: Array.from(groupByParentType(fields)).flatMap(
      ([typeCondition, fieldsByParentType]: [GraphQLCompositeType, FieldSet]) =>
        wrapInInlineFragmentIfNeeded(
          Array.from(groupByResponseName(fieldsByParentType).values()).map(
            fieldsByResponseName => {
              return combineFields(fieldsByResponseName)
                .fieldNode;
            },
          ),
          typeCondition,
          parentType,
        ),
    ),
  };
}

function wrapInInlineFragmentIfNeeded(
  selections: SelectionNode[],
  typeCondition: GraphQLCompositeType,
  parentType?: GraphQLCompositeType,
): SelectionNode[] {
  return typeCondition === parentType
    ? selections
    : [
        {
          kind: Kind.INLINE_FRAGMENT,
          typeCondition: {
            kind: Kind.NAMED_TYPE,
            name: {
              kind: Kind.NAME,
              value: typeCondition.name,
            },
          },
          selectionSet: { kind: Kind.SELECTION_SET, selections },
        },
      ];
}

function combineFields(
  fields: FieldSet,
): Field {
  const { scope, fieldNode, fieldDef } = fields[0];
  const returnType = getNamedType(fieldDef.type);

  if (isCompositeType(returnType)) {
    return {
      scope,
      fieldNode: {
        ...fieldNode,
        selectionSet: mergeSelectionSets(fields.map(field => field.fieldNode)),
      },
      fieldDef,
    };
  } else {
    return { scope, fieldNode, fieldDef };
  }
}

function mergeSelectionSets(fieldNodes: FieldNode[]): SelectionSetNode {
  const selections: SelectionNode[] = [];

  for (const fieldNode of fieldNodes) {
    if (!fieldNode.selectionSet) continue;

    selections.push(...fieldNode.selectionSet.selections);
  }

  return {
    kind: 'SelectionSet',
    selections: mergeSelectionsSetsInternal(selections),
  };
}

function mergeSelectionsSetsInternal(fieldNodes: SelectionNode[]): SelectionNode[] {
  const scalars: SelectionNode[] = [];
  const selectionMap: Map<string, {field: SelectionNode[], selections: SelectionNode[]}> = new Map();

  for (const fieldNode of fieldNodes) {
    // @ts-ignore
    if (!fieldNode.selectionSet) {
      // @ts-ignore
      if (!scalars.find(scalar => scalar.name.value === fieldNode.name.value)) {
        scalars.push(fieldNode);
      }
      continue;
    }
    // @ts-ignore
    const name = fieldNode.name?.value || fieldNode.typeCondition.name.value
    const selections: {field: SelectionNode[], selections: SelectionNode[]} = selectionMap.get(name) || {field: [fieldNode], selections: []};
    // @ts-ignore
    selections.selections.push(...fieldNode.selectionSet.selections);
    selections.field.push(fieldNode);
    selectionMap.set(name, selections)
  }

  const result = Array.from(selectionMap.values()).map(selection => {
    // @ts-ignore
    const name = selection.field[0].name?.value || selection.field[0].typeCondition.name.value
    const field = selectionMap.get(name)?.field[0];
    // @ts-ignore
    const clone = {...field}
    // @ts-ignore
    clone.selectionSet?.selections = mergeSelectionsSetsInternal(selection.selections)
    return clone;
  })
  result.unshift(...scalars);

  return result.flat();
}
