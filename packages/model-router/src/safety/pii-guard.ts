import type { LLMRequest } from '../providers/types.js';

export class PIIRefusedError extends Error {
  readonly code = 'PII_REFUSED';
  readonly httpStatus = 422;
  readonly retryable = false;

  constructor(public readonly fieldName: string) {
    super(`Request refused: field "${fieldName}" is marked as PII and cannot be sent to an LLM provider.`);
    this.name = 'PIIRefusedError';
  }
}

/**
 * Scan message content for PII-tagged field names embedded as JSON keys.
 * Throws PIIRefusedError if any flagged field has a non-trivial value in the payload.
 */
export function guardPii(request: LLMRequest): void {
  if (!request.piiFields?.length) return;

  const piiSet = new Set(request.piiFields.map((f) => f.toLowerCase()));

  for (const msg of request.messages) {
    const text =
      typeof msg.content === 'string'
        ? msg.content
        : msg.content.map((p) => p.text ?? '').join(' ');

    for (const field of piiSet) {
      // Match: "fieldName": "value with at least 3 chars" (case-insensitive key)
      const fieldPattern = new RegExp(`"${field}"\\s*:\\s*"[^"]{3,}"`, 'i');
      if (fieldPattern.test(text)) {
        throw new PIIRefusedError(field);
      }
    }
  }
}
