import { ESLintUtils } from '@typescript-eslint/utils';

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://docs.stackby.com/studio/eslint/${name}`,
);

const SDK_HOOKS = new Set(['useRecords', 'useRecord', 'useTable', 'useLinkedRecords']);

export const requireLoadingState = createRule({
  name: 'require-loading-state',
  meta: {
    type: 'suggestion',
    docs: {
      description: 'SDK hook results must handle isLoading before accessing .data.',
    },
    messages: {
      missing:
        'useRecords/useRecord result .data is accessed but .isLoading is not checked in this scope.',
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    return {
      VariableDeclarator(node) {
        const init = node.init;
        if (!init || init.type !== 'CallExpression') return;
        if (init.callee.type !== 'Identifier') return;
        if (!SDK_HOOKS.has(init.callee.name)) return;
        if (node.id.type !== 'ObjectPattern') return;

        const props = node.id.properties;
        const hasData = props.some(
          (p) =>
            p.type === 'Property' &&
            p.key.type === 'Identifier' &&
            p.key.name === 'data',
        );
        const hasLoading = props.some(
          (p) =>
            p.type === 'Property' &&
            p.key.type === 'Identifier' &&
            (p.key.name === 'isLoading' || p.key.name === 'isFetching'),
        );
        if (hasData && !hasLoading) {
          context.report({ node, messageId: 'missing' });
        }
      },
    };
  },
});
