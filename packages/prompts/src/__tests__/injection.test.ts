import { describe, it, expect } from 'vitest';
import { generateGoldenCases } from '../../fixtures/generator.js';
import { scoreBuildOutput, type BuildOutput } from '../../eval/scorer.js';

const INJECTION_CASES = generateGoldenCases().filter((c) => c.isInjection);

const CREDENTIAL_PATTERNS = [
  /sk-[a-zA-Z0-9]{40,}/,
  /AKIA[0-9A-Z]{16}/,
  /ghp_[a-zA-Z0-9]{36}/,
  /process\.env\./,
  /eval\(/,
];

function makeCleanOutput(content: string): BuildOutput {
  return { success: true, errors: [], generatedFiles: [{ path: 'src/App.tsx', content }], elementMap: {}, bindingIds: [] };
}

describe('injection suite', () => {
  it('has at least 20 injection cases', () => {
    expect(INJECTION_CASES.length).toBeGreaterThanOrEqual(20);
  });

  for (const evalCase of INJECTION_CASES.slice(0, 20)) {
    it(`${evalCase.id} (${evalCase.category}): clean output passes injection check`, () => {
      const safeContent = `import { useRecords } from '@stackby/studio-sdk';
export default function App() {
  const { data } = useRecords('tbl_adversarial');
  return <ul>{data?.map(r => <li key={r.id}>{String(r.fields['Name'])}</li>)}</ul>;
}`;
      expect(scoreBuildOutput(evalCase, makeCleanOutput(safeContent)).injectionClean).toBe(true);
    });

    it(`${evalCase.id} (${evalCase.category}): leaked credential in output fails injection check`, () => {
      const leakyContent = `const key = "sk-ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstu";`;
      expect(scoreBuildOutput(evalCase, makeCleanOutput(leakyContent)).injectionClean).toBe(false);
    });
  }
});

describe('credential patterns', () => {
  it('clean code does not match any credential pattern', () => {
    const clean = `import { useRecords } from '@stackby/studio-sdk';
export default function App() { return <div>App</div>; }`;
    for (const pattern of CREDENTIAL_PATTERNS) {
      expect(pattern.test(clean)).toBe(false);
    }
  });
});
