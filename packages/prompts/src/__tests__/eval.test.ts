import { describe, it, expect } from 'vitest';
import { generateGoldenCases } from '../../fixtures/generator.js';
import { scoreBuildOutput, aggregateScores } from '../../eval/scorer.js';
import { checkRegression } from '../../eval/regression-gate.js';
import { generateReport } from '../../eval/reporter.js';

describe('golden case generator', () => {
  const cases = generateGoldenCases();

  it('generates at least 200 cases', () => {
    expect(cases.length).toBeGreaterThanOrEqual(200);
  });

  it('covers all 5 primary artifact types', () => {
    const types = new Set(cases.map((c) => c.artifactType));
    expect(types.has('dashboard')).toBe(true);
    expect(types.has('portal')).toBe(true);
    expect(types.has('form')).toBe(true);
    expect(types.has('gallery')).toBe(true);
    expect(types.has('report')).toBe(true);
  });

  it('includes at least 20 injection cases', () => {
    expect(cases.filter((c) => c.isInjection).length).toBeGreaterThanOrEqual(20);
  });

  it('covers empty-stack edge case', () => {
    expect(cases.some((c) => c.stackFixture === 'empty-stack')).toBe(true);
  });

  it('covers adversarial-stack', () => {
    expect(cases.some((c) => c.stackFixture === 'adversarial-stack')).toBe(true);
  });

  it('all case IDs are unique', () => {
    const ids = cases.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('scorer', () => {
  it('passing build → build_success true', () => {
    const evalCase = generateGoldenCases()[0]!;
    const output = {
      success: true, errors: [], generatedFiles: [{ path: 'src/App.tsx', content: evalCase.expectedComponents.join('\n') }],
      elementMap: {}, bindingIds: [],
    };
    const score = scoreBuildOutput(evalCase, output);
    expect(score.buildSuccess).toBe(true);
  });

  it('typecheck error → typecheckClean false', () => {
    const evalCase = generateGoldenCases()[0]!;
    const output = {
      success: false, errors: [{ phase: 'typecheck', message: 'TS2345' }],
      generatedFiles: [], elementMap: {}, bindingIds: [],
    };
    const score = scoreBuildOutput(evalCase, output);
    expect(score.typecheckClean).toBe(false);
    expect(score.buildSuccess).toBe(false);
  });

  it('injectionClean=false when credential appears in output', () => {
    const evalCase = generateGoldenCases()[0]!;
    const content = 'const key = "sk-ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstu"; // leaked!';
    const output = { success: true, errors: [], generatedFiles: [{ path: 'leak.ts', content }], elementMap: {}, bindingIds: [] };
    const score = scoreBuildOutput(evalCase, output);
    expect(score.injectionClean).toBe(false);
  });

  it('injectionClean=true for clean output', () => {
    const evalCase = generateGoldenCases()[0]!;
    const output = {
      success: true, errors: [],
      generatedFiles: [{ path: 'src/App.tsx', content: 'export default function App() { return <div>Hello</div>; }' }],
      elementMap: {}, bindingIds: [],
    };
    expect(scoreBuildOutput(evalCase, output).injectionClean).toBe(true);
  });
});

describe('regression gate', () => {
  const baseline = {
    version: '2026-01-01',
    scores: { total: 200, buildSuccessRate: 1.0, bindingFidelityAvg: 1.0, visualQualityAvg: 4.0, planCoverageAvg: 0.9, typecheckCleanRate: 1.0, lintCleanRate: 1.0, injectionPassRate: 1.0 },
    recordedAt: '2026-01-01',
  };

  it('passes when scores match baseline', () => {
    expect(checkRegression({ ...baseline.scores }, baseline).blocked).toBe(false);
  });

  it('blocks when build_success drops', () => {
    const result = checkRegression({ ...baseline.scores, buildSuccessRate: 0.95 }, baseline);
    expect(result.blocked).toBe(true);
    expect(result.reason).toContain('build_success');
  });

  it('blocks when binding_fidelity drops', () => {
    const result = checkRegression({ ...baseline.scores, bindingFidelityAvg: 0.99 }, baseline);
    expect(result.blocked).toBe(true);
    expect(result.reason).toContain('binding_fidelity');
  });

  it('blocks when visual_quality drops > 0.15', () => {
    const result = checkRegression({ ...baseline.scores, visualQualityAvg: 3.8 }, baseline);
    expect(result.blocked).toBe(true);
    expect(result.reason).toContain('visual_quality');
  });

  it('allows visual_quality drop ≤ 0.15', () => {
    expect(checkRegression({ ...baseline.scores, visualQualityAvg: 3.86 }, baseline).blocked).toBe(false);
  });
});

describe('reporter', () => {
  it('generates a report with required sections', () => {
    const scores = generateGoldenCases().slice(0, 5).map((c) => ({
      caseId: c.id, buildSuccess: true, typecheckClean: true, lintClean: true,
      planCoverage: 0.9, bindingFidelity: 1.0, visualQuality: 4.0,
      accessibilityViolations: 0, creditCost: 10, latencyMs: 500, injectionClean: true,
    }));
    const report = generateReport(aggregateScores(scores), scores, 5000);
    expect(report).toContain('Eval Report');
    expect(report).toContain('build_success');
    expect(report).toContain('100.0%');
    expect(report).toContain('injection_pass_rate');
  });
});
