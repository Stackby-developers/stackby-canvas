import { createHash } from 'node:crypto';
import type { FileOperation } from '@stackby/schema-types';

export interface IncrementalResult {
  changedFiles: FileOperation[];
  incremental: boolean;
}

export function getIncrementalChanges(
  files: FileOperation[],
  previousHashes: Record<string, string>,
  newHashes: Record<string, string>,
): IncrementalResult {
  const changedFiles: FileOperation[] = [];

  for (const op of files) {
    if (op.op !== 'write') {
      changedFiles.push(op);
      continue;
    }
    const prev = previousHashes[op.path];
    const curr = newHashes[op.path];
    if (prev !== curr) {
      changedFiles.push(op);
    }
  }

  return { changedFiles, incremental: changedFiles.length < files.length };
}

export function computeFileHash(content: string): string {
  return createHash('sha256').update(content).digest('hex').slice(0, 16);
}
