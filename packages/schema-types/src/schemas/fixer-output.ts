import { z } from 'zod';
import { CodeGenOperationSchema } from './codegen-output.js';

export const FixerUnresolvedItemSchema = z.object({
  id: z.string().min(1),
  why: z.string().min(1),
});
export type FixerUnresolvedItem = z.infer<typeof FixerUnresolvedItemSchema>;

export const FixerOutputSchema = z
  .object({
    operations: z.array(CodeGenOperationSchema),
    resolved: z.array(z.string()),
    unresolved: z.array(FixerUnresolvedItemSchema),
  })
  .superRefine((val, ctx) => {
    // An id must not appear in both resolved and unresolved.
    const resolvedSet = new Set(val.resolved);
    for (const [i, item] of val.unresolved.entries()) {
      if (resolvedSet.has(item.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['unresolved', i, 'id'],
          message: `Defect "${item.id}" appears in both resolved and unresolved`,
        });
      }
    }

    // operations must still honour the write+delete constraint and config protection.
    // (CodeGenOperationSchema already validates individual op shape; the array-level
    // cross-path rules are re-applied here for the fixer's operations array.)
    const written = new Set<string>();
    const deleted = new Set<string>();
    for (const [i, op] of val.operations.entries()) {
      if (op.op === 'write' || op.op === 'patch') {
        if (deleted.has(op.path)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['operations', i, 'path'],
            message: `"${op.path}" is both deleted and written/patched in the same output`,
          });
        }
        written.add(op.path);
      } else if (op.op === 'delete') {
        if (written.has(op.path)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['operations', i, 'path'],
            message: `"${op.path}" is both written/patched and deleted in the same output`,
          });
        }
        if (op.path === 'stackby.config.json') {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['operations', i, 'path'],
            message: '"stackby.config.json" must not be deleted',
          });
        }
        deleted.add(op.path);
      }
    }
  });
export type FixerOutput = z.infer<typeof FixerOutputSchema>;
