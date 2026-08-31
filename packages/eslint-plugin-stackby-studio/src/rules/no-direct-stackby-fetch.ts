import { ESLintUtils } from '@typescript-eslint/utils';

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://docs.stackby.com/studio/eslint/${name}`,
);

export const noDirectStackbyFetch = createRule({
  name: 'no-direct-stackby-fetch',
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow direct calls to the Stackby API. Use SDK hooks instead.',
    },
    messages: {
      forbidden:
        'Direct Stackby API calls are not allowed in generated artifacts. Use useRecords() or StackbyStudioClient instead.',
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    return {
      CallExpression(node) {
        const callee = node.callee;
        const isRawFetch = callee.type === 'Identifier' && callee.name === 'fetch';
        const isAxios =
          callee.type === 'MemberExpression' &&
          callee.object.type === 'Identifier' &&
          callee.object.name === 'axios';

        if (!isRawFetch && !isAxios) return;

        const firstArg = node.arguments[0];
        if (
          firstArg &&
          firstArg.type === 'Literal' &&
          typeof firstArg.value === 'string' &&
          firstArg.value.includes('stackby.com')
        ) {
          context.report({ node, messageId: 'forbidden' });
        }
      },
    };
  },
});
