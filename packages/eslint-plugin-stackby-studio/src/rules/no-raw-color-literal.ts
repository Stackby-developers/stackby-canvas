import { ESLintUtils } from '@typescript-eslint/utils';
import type { TSESTree } from '@typescript-eslint/utils';

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://docs.stackby.com/studio/eslint/${name}`,
);

const HEX_REGEX = /^#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

export const noRawColorLiteral = createRule({
  name: 'no-raw-color-literal',
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Disallow raw hex color literals. Use design token variables instead.',
    },
    messages: {
      forbidden:
        'Raw color literal "{{color}}" found. Use a design token variable instead.',
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    function check(value: unknown, node: TSESTree.Node) {
      if (typeof value === 'string' && HEX_REGEX.test(value)) {
        context.report({ node, messageId: 'forbidden', data: { color: value } });
      }
    }

    return {
      JSXAttribute(node) {
        if (node.value?.type === 'Literal') {
          check(node.value.value, node.value);
        }
      },
      Property(node) {
        if (node.value.type === 'Literal') {
          check(node.value.value, node.value);
        }
      },
    };
  },
});
