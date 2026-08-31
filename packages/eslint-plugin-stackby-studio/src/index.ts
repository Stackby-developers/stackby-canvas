import { noDirectStackbyFetch } from './rules/no-direct-stackby-fetch';
import { noRawColorLiteral } from './rules/no-raw-color-literal';
import { requireLoadingState } from './rules/require-loading-state';
import { requireEmptyState } from './rules/require-empty-state';
import { noWriteToDerivedColumn } from './rules/no-write-to-derived-column';

const plugin = {
  rules: {
    'no-direct-stackby-fetch': noDirectStackbyFetch,
    'no-raw-color-literal': noRawColorLiteral,
    'require-loading-state': requireLoadingState,
    'require-empty-state': requireEmptyState,
    'no-write-to-derived-column': noWriteToDerivedColumn,
  },
  configs: {
    recommended: {
      plugins: ['stackby-studio'],
      rules: {
        'stackby-studio/no-direct-stackby-fetch': 'error',
        'stackby-studio/no-raw-color-literal': 'warn',
        'stackby-studio/require-loading-state': 'warn',
        'stackby-studio/require-empty-state': 'warn',
        'stackby-studio/no-write-to-derived-column': 'error',
      },
    },
  },
};

export = plugin;
