import type { PromptSegment } from './order.js';
import { SHARED_PREAMBLE } from '../shared/preamble.js';
import { SDK_DOCS } from '../shared/sdk-docs.js';

export type SegmentValues = Partial<Record<PromptSegment, string>> & {
  rejectionFeedback?: string | undefined;
};

/**
 * Assemble a prompt in the canonical cache-optimised order.
 * Stable segments come first to maximise provider cache hits.
 * Variable/per-turn content comes last.
 */
export function assemblePrompt(agentInstruction: string, values: SegmentValues): string {
  const segments: string[] = [];

  segments.push(SHARED_PREAMBLE);
  segments.push(SDK_DOCS);

  if (values.schema) segments.push(`<stackby_schema>\n${values.schema}\n</stackby_schema>`);
  if (values.tokens) segments.push(`<design_tokens>\n${values.tokens}\n</design_tokens>`);
  if (values.plan) segments.push(`<plan>\n${values.plan}\n</plan>`);
  if (values.conversation) segments.push(`<conversation_history>\n${values.conversation}\n</conversation_history>`);

  const turnParts = [agentInstruction];
  if (values.turnInstruction) turnParts.push(values.turnInstruction);
  if (values.rejectionFeedback) turnParts.push(`Previous plan was rejected: ${values.rejectionFeedback}`);
  segments.push(turnParts.join('\n\n'));

  return segments.join('\n\n---\n\n');
}

export function buildPrompt(agentInstruction: string, values: SegmentValues): string {
  return assemblePrompt(agentInstruction, values);
}
