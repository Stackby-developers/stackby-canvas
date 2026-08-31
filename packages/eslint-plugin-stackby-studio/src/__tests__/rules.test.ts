import { RuleTester } from '@typescript-eslint/rule-tester';
import { afterAll, describe, it } from 'vitest';
import { noDirectStackbyFetch } from '../rules/no-direct-stackby-fetch';
import { noRawColorLiteral } from '../rules/no-raw-color-literal';
import { requireLoadingState } from '../rules/require-loading-state';
import { requireEmptyState } from '../rules/require-empty-state';
import { noWriteToDerivedColumn } from '../rules/no-write-to-derived-column';

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;

const tester = new RuleTester({
  parser: require.resolve('@typescript-eslint/parser'),
  parserOptions: { ecmaVersion: 2020, sourceType: 'module', ecmaFeatures: { jsx: true } },
});

describe('no-direct-stackby-fetch', () => {
  tester.run('no-direct-stackby-fetch', noDirectStackbyFetch, {
    valid: [
      { code: `fetch('https://my-gateway.example.com/dg/v1/read', {})` },
      { code: `fetch('/dg/v1/read', {})` },
      { code: `useRecords('tbl_tasks')` },
      { code: `axios.get('/api/v2/data')` },
    ],
    invalid: [
      {
        code: `fetch('https://api.stackby.com/API/v2/mystack/mytable', {})`,
        errors: [{ messageId: 'forbidden' }],
      },
      {
        code: `fetch('https://app.stackby.com/something')`,
        errors: [{ messageId: 'forbidden' }],
      },
      {
        code: `axios.get('https://api.stackby.com/API/v2/stk/tbl')`,
        errors: [{ messageId: 'forbidden' }],
      },
    ],
  });
});

describe('no-raw-color-literal', () => {
  tester.run('no-raw-color-literal', noRawColorLiteral, {
    valid: [
      { code: `const x = { color: 'var(--color-primary)' }` },
      { code: `const x = { color: 'rgb(255,0,0)' }` },
      { code: `const x = { borderRadius: '4px' }` },
    ],
    invalid: [
      {
        code: `const x = { color: '#FF0000' }`,
        errors: [{ messageId: 'forbidden' }],
      },
      {
        code: `const x = { backgroundColor: '#abc' }`,
        errors: [{ messageId: 'forbidden' }],
      },
      {
        code: `const x = { border: '#1a2b3c4d' }`,
        errors: [{ messageId: 'forbidden' }],
      },
    ],
  });
});

describe('require-loading-state', () => {
  tester.run('require-loading-state', requireLoadingState, {
    valid: [
      { code: `const { data, isLoading } = useRecords('tbl')` },
      { code: `const { data, isFetching } = useRecords('tbl')` },
      { code: `const { isLoading } = useRecord('tbl', id)` },
      { code: `const x = useRecords('tbl')` }, // no destructuring, no violation
    ],
    invalid: [
      {
        code: `const { data } = useRecords('tbl')`,
        errors: [{ messageId: 'missing' }],
      },
      {
        code: `const { data, error } = useRecord('tbl', id)`,
        errors: [{ messageId: 'missing' }],
      },
    ],
  });
});

describe('require-empty-state', () => {
  tester.run('require-empty-state', requireEmptyState, {
    valid: [
      { code: `const { data: rows, isEmpty } = useRecords('tbl'); rows.map(r => r.id)` },
      {
        code: `const { data: rows, isEmpty, isLoading } = useRecords('tbl'); rows?.map(r => r)`,
      },
    ],
    invalid: [
      {
        code: `const { data: rows } = useRecords('tbl'); rows.map(r => r.id)`,
        errors: [{ messageId: 'missing' }],
      },
      {
        code: `const { data: items } = useTable('tbl'); items.map(i => i)`,
        errors: [{ messageId: 'missing' }],
      },
    ],
  });
});

describe('no-write-to-derived-column', () => {
  tester.run('no-write-to-derived-column', noWriteToDerivedColumn, {
    valid: [
      { code: `const fields = { Name: 'x', Status: 'Active' }` },
      { code: `const fields = { Price: 99, Quantity: 2 }` },
    ],
    invalid: [
      {
        code: `const fields = { formula: 100 }`,
        errors: [{ messageId: 'forbidden' }],
      },
      {
        code: `const fields = { lookup: 'x' }`,
        errors: [{ messageId: 'forbidden' }],
      },
      {
        code: `const fields = { autoNumber: 42, rollup: 10 }`,
        errors: [{ messageId: 'forbidden' }, { messageId: 'forbidden' }],
      },
    ],
  });
});
