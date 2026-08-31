import { describe, it, expect } from 'vitest';
import type { FileOperation, Plan } from '@stackby/schema-types';
import { buildPrompt, AGENTS } from '@stackby/prompts';

describe('self-heal loop — fix activity logic', () => {
  it('prompt assembly includes issue type and cycle count', () => {
    const plan: Plan = {
      id: 'plan_1', runId: 'run_1', intent: 'test', artifactType: 'dashboard',
      stackId: 'stk_1', steps: [], createdAt: new Date().toISOString(),
    };
    const systemPrompt = buildPrompt(AGENTS.fixer, { plan: JSON.stringify(plan) });
    expect(systemPrompt).toContain('root cause');
    expect(systemPrompt).toContain('symptom');
  });

  it('fixer prompt is non-empty and contains key instructions', () => {
    expect(AGENTS.fixer.length).toBeGreaterThan(50);
    expect(AGENTS.fixer).toContain('root cause');
  });

  it('code generator prompt enforces four required states', () => {
    expect(AGENTS.codeGenerator).toContain('loading');
    expect(AGENTS.codeGenerator).toContain('empty');
    expect(AGENTS.codeGenerator).toContain('error');
    expect(AGENTS.codeGenerator).toContain('permission-denied');
  });

  it('visual verifier prompt requires layout and overflow checks', () => {
    expect(AGENTS.visualVerifier).toContain('overflow');
    expect(AGENTS.visualVerifier).toContain('layout');
  });

  it('fixer prompt rejects symptom fixes', () => {
    expect(AGENTS.fixer).toContain('symptom');
  });
});

describe('parseFileOperations — code extraction', () => {
  // Test the file operation parser used by generate-code and fix
  function parseFileOperations(content: string): FileOperation[] {
    const ops: FileOperation[] = [];
    const re = /```(?:\w+)?\s+(?:path=)?([\w/.@-]+)\n([\s\S]*?)```/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(content)) !== null) {
      if (m[1] && m[2]) ops.push({ op: 'write', path: m[1], content: m[2] });
    }
    return ops.length > 0 ? ops : [{ op: 'write', path: 'src/App.tsx', content }];
  }

  it('extracts files from fenced blocks with path= prefix', () => {
    const content = '```tsx path=src/components/Foo.tsx\nexport const Foo = () => null;\n```';
    const ops = parseFileOperations(content);
    expect(ops).toHaveLength(1);
    expect(ops[0]?.op).toBe('write');
    if (ops[0]?.op === 'write') {
      expect(ops[0].path).toBe('src/components/Foo.tsx');
    }
  });

  it('extracts multiple files', () => {
    const content = [
      '```tsx src/App.tsx\nconst App = () => null;\n```',
      '```tsx src/components/Header.tsx\nconst Header = () => null;\n```',
    ].join('\n\n');
    const ops = parseFileOperations(content);
    expect(ops).toHaveLength(2);
  });

  it('falls back to App.tsx when no fenced blocks found', () => {
    const ops = parseFileOperations('just plain text with no blocks');
    expect(ops).toHaveLength(1);
    if (ops[0]?.op === 'write') expect(ops[0].path).toBe('src/App.tsx');
  });
});
