import type { FileOperation } from '@stackby/schema-types';
import type { ActivityContext } from '../workflows/shared/workflow-types.js';

export async function applyOperations(
  input: ActivityContext & { fileOps: FileOperation[] },
): Promise<{ paths: string[] }> {
  const writePaths = new Set<string>();
  for (const op of input.fileOps) {
    if (op.op === 'write') {
      if (writePaths.has(op.path)) throw new Error(`Duplicate write to path: ${op.path}`);
      writePaths.add(op.path);
    }
  }
  return { paths: [...writePaths] };
}
