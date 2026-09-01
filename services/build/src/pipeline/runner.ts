import { randomUUID, createHash } from 'node:crypto';
import type { BuildInput, BuildResult, BuildError } from './types.js';
import type { Config } from '../config.js';
import { materialise, hashFiles } from './materialise.js';
import { checkAllowlist, type AllowlistConfig } from './allowlist.js';
import { runTypecheck } from './typecheck.js';
import { runEslint } from './lint.js';
import { runViteBuild } from './bundle.js';
import { getIncrementalChanges } from '../cache/incremental.js';

export interface PipelineRunnerDeps {
  config: Config;
  allowlistConfig: AllowlistConfig;
  captureScreenshots: (url: string, buildId: string) => Promise<BuildResult['screenshots']>;
  buildElementMap: (url: string) => Promise<BuildResult['elementMap']>;
  serveBundle: (outputDir: string, buildId: string) => Promise<string>;
}

function earlyReturn(
  buildId: string,
  errors: BuildError[],
  warnings: BuildError[],
  startMs: number,
  incremental: boolean,
): BuildResult {
  return {
    buildId, success: false, errors, warnings,
    previewUrl: '', screenshotUrl: '', screenshots: [], elementMap: {},
    buildHash: '', durationMs: Date.now() - startMs,
    consoleErrors: [], failedRequests: [], incremental,
  };
}

export async function runPipeline(input: BuildInput, deps: PipelineRunnerDeps): Promise<BuildResult> {
  const startMs = Date.now();
  const buildId = randomUUID();

  // Compute hashes and determine incremental scope
  const newHashes = await hashFiles(input.files);
  const { changedFiles, incremental } = input.previousHashes
    ? getIncrementalChanges(input.files, input.previousHashes, newHashes)
    : { changedFiles: input.files, incremental: false };

  // Materialise files to a temp directory
  const scanFiles = incremental ? changedFiles : input.files;
  const { workDir, cleanup } = await materialise(input.files, deps.config.BUILD_ARTIFACTS_DIR);

  try {
    // 1. Allowlist — fast fail before any compilation
    const allowlistErrors = checkAllowlist(workDir, deps.allowlistConfig);
    if (allowlistErrors.length) {
      return earlyReturn(buildId, allowlistErrors, [], startMs, incremental);
    }

    const phaseTimeout = Math.floor(deps.config.BUILD_TIMEOUT_MS / 4);

    // 2. TypeScript typecheck
    const tsResults = runTypecheck(workDir, phaseTimeout);
    const tsErrors = tsResults.filter((e) => e.severity === 'error');
    const tsWarnings = tsResults.filter((e) => e.severity === 'warning');
    if (tsErrors.length) return earlyReturn(buildId, tsErrors, tsWarnings, startMs, incremental);

    // 3. ESLint
    const lintResults = runEslint(workDir, phaseTimeout);
    const lintErrors = lintResults.filter((e) => e.severity === 'error');
    const lintWarnings = lintResults.filter((e) => e.severity === 'warning');
    const allWarnings = [...tsWarnings, ...lintWarnings];
    if (lintErrors.length) return earlyReturn(buildId, lintErrors, allWarnings, startMs, incremental);

    // 4. Vite bundle
    const bundleResult = runViteBuild(workDir, deps.config.BUILD_TIMEOUT_MS);
    if (!bundleResult.success) {
      return earlyReturn(buildId, bundleResult.errors, allWarnings, startMs, incremental);
    }

    // 5. Serve + capture
    const previewUrl = await deps.serveBundle(bundleResult.outputDir, buildId);
    const [screenshots, elementMap] = await Promise.all([
      deps.captureScreenshots(previewUrl, buildId),
      deps.buildElementMap(previewUrl),
    ]);

    const buildHash = createHash('sha256')
      .update(JSON.stringify(newHashes))
      .digest('hex')
      .slice(0, 16);

    const screenshot1440 = screenshots.find((s) => s.breakpoint === 1440);

    return {
      buildId,
      success: true,
      errors: [],
      warnings: allWarnings,
      previewUrl,
      screenshotUrl: screenshot1440 ? `data:image/png;base64,${screenshot1440.dataUrl}` : '',
      screenshots,
      elementMap,
      buildHash,
      durationMs: Date.now() - startMs,
      consoleErrors: [],
      failedRequests: [],
      incremental,
    };
  } finally {
    await cleanup();
  }
}
