import { ESLintUtils } from '@typescript-eslint/utils';
import type { TSESTree } from '@typescript-eslint/utils';

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://docs.stackby.com/studio/eslint/${name}`,
);

const SDK_HOOKS = new Set(['useRecords', 'useTable', 'useLinkedRecords', 'useSearch']);

export const requireEmptyState = createRule({
  name: 'require-empty-state',
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Components rendering a list from a SDK hook must handle isEmpty.',
    },
    messages: {
      missing:
        'List from SDK hook is rendered with .map() but .isEmpty is not destructured.',
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    // Track variable names that came from SDK hooks WITHOUT isEmpty destructured
    const noEmptyVars = new Set<string>();

    return {
      VariableDeclarator(node) {
        const init = node.init;
        if (!init || init.type !== 'CallExpression') return;
        if (init.callee.type !== 'Identifier') return;
        if (!SDK_HOOKS.has(init.callee.name)) return;
        if (node.id.type !== 'ObjectPattern') return;

        const props = node.id.properties;
        const dataProp = props.find(
          (p): p is TSESTree.Property =>
            p.type === 'Property' &&
            p.key.type === 'Identifier' &&
            (p.key as TSESTree.Identifier).name === 'data',
        );
        const hasEmpty = props.some(
          (p) =>
            p.type === 'Property' &&
            p.key.type === 'Identifier' &&
            (p.key as TSESTree.Identifier).name === 'isEmpty',
        );

        if (dataProp && !hasEmpty && dataProp.value.type === 'Identifier') {
          noEmptyVars.add((dataProp.value as TSESTree.Identifier).name);
        }
      },

      MemberExpression(node) {
        if (
          node.property.type === 'Identifier' &&
          node.property.name === 'map' &&
          node.object.type === 'Identifier' &&
          noEmptyVars.has((node.object as TSESTree.Identifier).name)
        ) {
          context.report({ node, messageId: 'missing' });
        }
      },
    };
  },
});
