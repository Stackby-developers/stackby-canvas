import { randomUUID } from 'node:crypto';
import type { Plan } from '@stackby/schema-types';
import type { ActivityContext, BuildResult, VerifyResult, GenerationOutput } from '../workflows/shared/workflow-types.js';

export async function finalise(
  input: ActivityContext & { plan: Plan; buildResult: BuildResult; verifyResult?: VerifyResult },
): Promise<GenerationOutput> {
  return {
    artifactId: randomUUID(),
    versionId: randomUUID(),
    previewUrl: input.buildResult?.previewUrl ?? '',
    buildHash: input.buildResult?.buildHash ?? '',
  };
}
