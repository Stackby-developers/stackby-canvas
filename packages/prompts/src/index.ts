export { buildPrompt, assemblePrompt } from './assembly/builder.js';
export type { SegmentValues } from './assembly/builder.js';
export { PROMPT_SEGMENT_ORDER } from './assembly/order.js';
export type { PromptSegment } from './assembly/order.js';
export { SHARED_PREAMBLE } from './shared/preamble.js';
export { SDK_DOCS } from './shared/sdk-docs.js';

export const PROMPT_VERSION = '0.1.0';
export function getPromptVersion(): string { return PROMPT_VERSION; }

import { INTENT_ANALYZER } from './agents/intent-analyzer.js';
import { SCHEMA_ANALYZER } from './agents/schema-analyzer.js';
import { CLARIFIER } from './agents/clarifier.js';
import { PLANNER } from './agents/planner.js';
import { CODE_GENERATOR } from './agents/code-generator.js';
import { VISUAL_VERIFIER } from './agents/visual-verifier.js';
import { FIXER } from './agents/fixer.js';
import { SUMMARISER } from './agents/summariser.js';

export const AGENTS = {
  intentAnalyzer: INTENT_ANALYZER,
  schemaAnalyzer: SCHEMA_ANALYZER,
  clarifier: CLARIFIER,
  planner: PLANNER,
  codeGenerator: CODE_GENERATOR,
  visualVerifier: VISUAL_VERIFIER,
  fixer: FIXER,
  summariser: SUMMARISER,
} as const;

export type AgentName = keyof typeof AGENTS;
