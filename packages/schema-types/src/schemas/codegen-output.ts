import { z } from 'zod';

// Path safety: reject directory traversal in all operations.
const SafePathSchema = z.string().min(1).refine(
  (p) => !p.includes('..') && !p.startsWith('/'),
  { message: 'Path must be relative and must not contain ".."' },
);

export const CodeGenWriteOpSchema = z.object({
  op: z.literal('write'),
  path: SafePathSchema,
  content: z.string(),
});
export type CodeGenWriteOp = z.infer<typeof CodeGenWriteOpSchema>;

export const CodeGenPatchOpSchema = z.object({
  op: z.literal('patch'),
  path: SafePathSchema,
  // find must be non-empty so the verifier has a locatable anchor.
  find: z.string().min(1),
  replace: z.string(),
});
export type CodeGenPatchOp = z.infer<typeof CodeGenPatchOpSchema>;

export const CodeGenDeleteOpSchema = z.object({
  op: z.literal('delete'),
  path: SafePathSchema,
});
export type CodeGenDeleteOp = z.infer<typeof CodeGenDeleteOpSchema>;

export const CodeGenOperationSchema = z.discriminatedUnion('op', [
  CodeGenWriteOpSchema,
  CodeGenPatchOpSchema,
  CodeGenDeleteOpSchema,
]);
export type CodeGenOperation = z.infer<typeof CodeGenOperationSchema>;

export const CodeGenOutputSchema = z
  .array(CodeGenOperationSchema)
  .min(1)
  .superRefine((ops, ctx) => {
    // A path must not be both written/patched and deleted in the same generation.
    const written = new Set<string>();
    const deleted = new Set<string>();

    for (const [i, op] of ops.entries()) {
      if (op.op === 'write' || op.op === 'patch') {
        if (deleted.has(op.path)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [i, 'path'],
            message: `"${op.path}" is both deleted and written/patched in the same output`,
          });
        }
        written.add(op.path);
      } else if (op.op === 'delete') {
        if (written.has(op.path)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [i, 'path'],
            message: `"${op.path}" is both written/patched and deleted in the same output`,
          });
        }
        deleted.add(op.path);
      }
    }

    // stackby.config.json must never be deleted.
    if (deleted.has('stackby.config.json')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['stackby.config.json'],
        message: '"stackby.config.json" must not be deleted',
      });
    }
  });
export type CodeGenOutput = z.infer<typeof CodeGenOutputSchema>;
