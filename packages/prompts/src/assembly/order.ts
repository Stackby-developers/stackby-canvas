/**
 * Stable prompt prefix ordering for maximum provider cache hits.
 * Stable content first → variable content last.
 *
 * Order: [sharedPreamble][sdkDocs][schema][tokens][plan][conversation][turnInstruction]
 */
export const PROMPT_SEGMENT_ORDER = [
  'sharedPreamble',
  'sdkDocs',
  'schema',
  'tokens',
  'plan',
  'conversation',
  'turnInstruction',
] as const;

export type PromptSegment = typeof PROMPT_SEGMENT_ORDER[number];
