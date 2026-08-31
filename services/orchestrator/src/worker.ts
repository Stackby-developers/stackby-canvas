import { Worker, NativeConnection } from '@temporalio/worker';
import { Redis } from 'ioredis';
import pg from 'pg';
import type { Config } from './config.js';
import { createLLMRouter } from './activities/shared/llm-router.js';

// Module-level singletons for activity dependencies
let _redis: Redis | undefined;
let _pool: pg.Pool | undefined;
let _llm: ReturnType<typeof createLLMRouter> | undefined;
let _schemaServiceUrl: string | undefined;
let _buildServiceUrl: string | undefined;

export function setupActivityDeps(config: Config): void {
  _redis = new Redis(config.REDIS_URL, { lazyConnect: false });
  _pool = new pg.Pool({ connectionString: config.DATABASE_URL });
  _llm = createLLMRouter(config);
  _schemaServiceUrl = config.SCHEMA_SERVICE_URL;
  _buildServiceUrl = config.BUILD_SERVICE_URL;
}

export function getActivityDeps() {
  if (!_redis || !_pool || !_llm || !_schemaServiceUrl || !_buildServiceUrl) {
    throw new Error('Activity deps not initialized — call setupActivityDeps first');
  }
  return { redis: _redis, pool: _pool, llm: _llm, schemaServiceUrl: _schemaServiceUrl, buildServiceUrl: _buildServiceUrl };
}

async function buildActivities() {
  const { redis, pool, llm, schemaServiceUrl, buildServiceUrl } = getActivityDeps();

  const [
    intent, schema, clarify, plan, design, codegen,
    applyOps, build, verify, fix, sum, finalise,
  ] = await Promise.all([
    import('./activities/analyze-intent.js'),
    import('./activities/analyze-schema.js'),
    import('./activities/clarify.js'),
    import('./activities/plan.js'),
    import('./activities/design.js'),
    import('./activities/generate-code.js'),
    import('./activities/apply-operations.js'),
    import('./activities/build-artifact.js'),
    import('./activities/verify-visually.js'),
    import('./activities/fix.js'),
    import('./activities/summarise.js'),
    import('./activities/finalise.js'),
  ]);

  // Inject deps via setDeps
  intent.setDeps({ llm, redis });
  schema.setDeps({ redis, schemaServiceUrl });
  clarify.setDeps({ llm, redis });
  plan.setDeps({ llm, redis });
  design.setDeps({ llm });
  codegen.setDeps({ llm, redis });
  build.setDeps({ redis, buildServiceUrl });
  verify.setDeps({ llm, redis });
  fix.setDeps({ llm, redis });
  sum.setDeps({ llm, redis });

  return {
    analyzeIntent: intent.analyzeIntent,
    analyzeSchema: schema.analyzeSchema,
    clarify: clarify.clarify,
    generatePlan: plan.generatePlan,
    generateStack: plan.generateStack,
    generateDesign: design.generateDesign,
    extractDesignTokens: design.extractDesignTokens,
    generateCode: codegen.generateCode,
    generateVisualPatch: codegen.generateVisualPatch,
    generateAnnotationPatches: codegen.generateAnnotationPatches,
    applyOperations: applyOps.applyOperations,
    buildArtifact: build.buildArtifact,
    verifyVisually: verify.verifyVisually,
    fixCode: fix.fixCode,
    summarise: sum.summarise,
    finalise: finalise.finalise,
  };
}

export async function createWorker(config: Config): Promise<Worker> {
  const connection = await NativeConnection.connect({ address: config.TEMPORAL_ADDRESS });
  const activities = await buildActivities();

  return Worker.create({
    connection,
    namespace: config.TEMPORAL_NAMESPACE,
    taskQueue: config.TEMPORAL_TASK_QUEUE,
    workflowsPath: new URL('./workflows/generation.js', import.meta.url).pathname,
    activities,
  });
}
