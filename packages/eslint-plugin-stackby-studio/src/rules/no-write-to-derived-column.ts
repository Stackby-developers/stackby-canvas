import { ESLintUtils } from '@typescript-eslint/utils';

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://docs.stackby.com/studio/eslint/${name}`,
);

const DERIVED_PATTERNS = [
  /formula/i,
  /^lookup$/i,
  /rollup/i,
  /^count$/i,
  /auto.?number/i,
  /created.?time/i,
  /last.?modified/i,
];

export const noWriteToDerivedColumn = createRule({
  name: 'no-write-to-derived-column',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow writing to formula/lookup/rollup/count/autoNumber columns.',
    },
    messages: {
      forbidden: 'Column "{{column}}" is a derived column and cannot be written.',
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    return {
      ObjectExpression(node) {
        for (const prop of node.properties) {
          if (prop.type !== 'Property') continue;
          if (prop.key.type !== 'Identifier') continue;
          const colName = prop.key.name;
          if (DERIVED_PATTERNS.some((p) => p.test(colName))) {
            context.report({ node: prop, messageId: 'forbidden', data: { column: colName } });
          }
        }
      },
    };
  },
});
