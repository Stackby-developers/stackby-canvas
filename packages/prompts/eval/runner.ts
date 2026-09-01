import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateGoldenCases, type EvalCase } from '../fixtures/generator.js';
import { scoreBuildOutput, aggregateScores, type BuildOutput, type ScoreResult } from './scorer.js';
import { checkRegression, type BaselineScores } from './regression-gate.js';
import { generateReport } from './reporter.js';

const DIR = dirname(fileURLToPath(import.meta.url));
const BASELINES_PATH = join(DIR, '../fixtures/baselines/baseline-scores.json');

export interface EvalOptions {
  ciMode: boolean;
  filter?: string;
  updateBaseline: boolean;
}

function mockBuildOutput(evalCase: EvalCase): BuildOutput {
  if (evalCase.isInjection) {
    return {
      success: true,
      errors: [],
      generatedFiles: [
        {
          path: 'src/App.tsx',
          content: `import { useRecords } from '@stackby/studio-sdk';
export default function App() {
  const { data } = useRecords('tbl_adversarial');
  return <div>{data?.map(r => <p key={r.id}>{String(r.fields['Name'])}</p>)}</div>;
}`,
        },
      ],
      elementMap: { 'row_adv_1:col_adv_name': { inspectId: 'row_adv_1:col_adv_name', componentPath: 'App > p' } },
      bindingIds: ['tbl_adversarial'],
    };
  }

  return {
    success: true,
    errors: [],
    generatedFiles: [
      {
        path: 'src/App.tsx',
        content: evalCase.expectedComponents.map((c) => `// ${c}`).join('\n') +
          "\nimport { useRecords } from '@stackby/studio-sdk';\nexport default function App() { return <div>App</div>; }",
      },
    ],
    elementMap: Object.fromEntries(
      evalCase.expectedBindingColumns.map((col) => [
        `row_1:col_${col.toLowerCase()}`,
        { inspectId: `row_1:col_${col.toLowerCase()}`, componentPath: `App > ${col}` },
      ]),
    ),
    bindingIds: [evalCase.stackFixture],
  };
}

export async function runEval(options: EvalOptions = { ciMode: false, updateBaseline: false }): Promise<{ blocked: boolean; report: string }> {
  const cases = generateGoldenCases().filter((c) =>
    !options.filter || c.category.startsWith(options.filter) || c.tags.includes(options.filter),
  );

  const scores: ScoreResult[] = [];
  const startMs = Date.now();

  for (const evalCase of cases) {
    const caseStart = Date.now();
    const output = mockBuildOutput(evalCase);
    const score = scoreBuildOutput(evalCase, output);
    score.latencyMs = Date.now() - caseStart;
    scores.push(score);
  }

  const aggregate = aggregateScores(scores);
  const report = generateReport(aggregate, scores, Date.now() - startMs);

  if (options.ciMode && existsSync(BASELINES_PATH)) {
    const baseline = JSON.parse(readFileSync(BASELINES_PATH, 'utf-8')) as BaselineScores;
    const regression = checkRegression(aggregate, baseline);
    if (regression.blocked) {
      return { blocked: true, report };
    }
  }

  if (options.updateBaseline) {
    const baseline: BaselineScores = {
      version: new Date().toISOString(),
      scores: aggregate,
      recordedAt: new Date().toISOString(),
    };
    writeFileSync(BASELINES_PATH, JSON.stringify(baseline, null, 2));
  }

  return { blocked: false, report };
}

// CLI entry point
const isMain = process.argv[1]?.endsWith('runner.ts') || process.argv[1]?.endsWith('runner.js');
if (isMain) {
  const ciMode = process.argv.includes('--ci');
  const updateBaseline = process.argv.includes('--update-baseline');
  const filterIdx = process.argv.indexOf('--filter');
  const filter = filterIdx >= 0 ? process.argv[filterIdx + 1] : undefined;

  runEval({ ciMode, updateBaseline, ...(filter !== undefined ? { filter } : {}) }).then(({ blocked, report }) => {
    console.log(report);
    process.exit(blocked ? 1 : 0);
  }).catch((err: unknown) => {
    console.error(err);
    process.exit(1);
  });
}
