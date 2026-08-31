// Versioned agent prompts — loaded by services/orchestrator at runtime
export const PROMPT_VERSION = '0.1.0';

export type PromptName =
  | 'intent-analyzer'
  | 'schema-analyzer'
  | 'clarifier'
  | 'planner'
  | 'code-generator'
  | 'visual-verifier'
  | 'fixer'
  | 'stack-generator';

export function getPromptVersion(): string {
  return PROMPT_VERSION;
}
