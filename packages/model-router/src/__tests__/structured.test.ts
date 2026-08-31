import { describe, it, expect, vi } from 'vitest';
import { callWithSchema } from '../structured/validator.js';
import { z } from 'zod';
import type { ModelRouter } from '../router.js';
import type { LLMResponse } from '../providers/types.js';

const Schema = z.object({ intent: z.string(), steps: z.array(z.string()) });

function fakeRouter(responses: string[]): ModelRouter {
  let i = 0;
  return {
    call: vi.fn(async () => {
      const content = responses[i++] ?? '';
      return { content } as LLMResponse;
    }),
  } as unknown as ModelRouter;
}

describe('callWithSchema', () => {
  it('returns parsed result on first valid response', async () => {
    const router = fakeRouter([JSON.stringify({ intent: 'build dashboard', steps: ['s1'] })]);
    const result = await callWithSchema(router, { messages: [{ role: 'user', content: 'plan' }] }, Schema, 'T2', {});
    expect(result.intent).toBe('build dashboard');
    expect((router.call as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(1);
  });

  it('retries once on malformed JSON and recovers', async () => {
    const router = fakeRouter([
      'Here you go: { intent: "build", steps: [] }',              // malformed (unquoted key)
      JSON.stringify({ intent: 'build', steps: ['fixed'] }),       // valid retry
    ]);
    const result = await callWithSchema(router, { messages: [{ role: 'user', content: 'plan' }] }, Schema, 'T2', {});
    expect(result.steps[0]).toBe('fixed');
    expect((router.call as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(2);

    // Retry message must carry validation error context
    const retryMsg = (router.call as ReturnType<typeof vi.fn>).mock.calls[1]?.[0] as { messages: Array<{ content: string }> } | undefined;
    const msgs = retryMsg?.messages ?? [];
    const last = msgs[msgs.length - 1];
    expect(last?.content).toContain('validation');
  });

  it('extracts JSON from a markdown code fence', async () => {
    const router = fakeRouter([
      '```json\n' + JSON.stringify({ intent: 'x', steps: [] }) + '\n```',
    ]);
    const result = await callWithSchema(router, { messages: [{ role: 'user', content: 'plan' }] }, Schema, 'T1', {});
    expect(result.intent).toBe('x');
  });

  it('throws after two consecutive parse failures', async () => {
    const router = fakeRouter(['not json', 'also not json']);
    await expect(
      callWithSchema(router, { messages: [{ role: 'user', content: 'plan' }] }, Schema, 'T2', {}),
    ).rejects.toThrow();
    expect((router.call as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(2);
  });
});
