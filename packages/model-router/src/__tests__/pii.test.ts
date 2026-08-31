import { describe, it, expect } from 'vitest';
import { guardPii, PIIRefusedError } from '../safety/pii-guard.js';

describe('guardPii', () => {
  it('passes when no piiFields are declared', () => {
    guardPii({ messages: [{ role: 'user', content: '{"email": "user@example.com"}' }] });
  });

  it('passes when piiFields list is empty', () => {
    guardPii({ messages: [{ role: 'user', content: '{"email": "x@y.com"}' }], piiFields: [] });
  });

  it('throws PIIRefusedError when a flagged field appears with a value', () => {
    expect(() =>
      guardPii({
        messages: [{ role: 'user', content: '{"email": "user@example.com", "name": "Alice"}' }],
        piiFields: ['email'],
      }),
    ).toThrow(PIIRefusedError);
  });

  it('is case-insensitive on field names', () => {
    expect(() =>
      guardPii({
        messages: [{ role: 'user', content: '{"Email": "user@example.com"}' }],
        piiFields: ['email'],
      }),
    ).toThrow(PIIRefusedError);
  });

  it('allows non-flagged fields', () => {
    guardPii({
      messages: [{ role: 'user', content: '{"status": "active", "count": 42}' }],
      piiFields: ['email', 'phone'],
    });
  });

  it('checks multi-part message content', () => {
    expect(() =>
      guardPii({
        messages: [{ role: 'user', content: [{ type: 'text', text: '{"phone": "555-555-5555"}' }] }],
        piiFields: ['phone'],
      }),
    ).toThrow(PIIRefusedError);
  });

  it('PIIRefusedError has correct code and retryable=false', () => {
    let caught: PIIRefusedError | undefined;
    try {
      guardPii({ messages: [{ role: 'user', content: '{"ssn": "123-45-6789"}' }], piiFields: ['ssn'] });
    } catch (e) {
      caught = e as PIIRefusedError;
    }
    expect(caught?.code).toBe('PII_REFUSED');
    expect(caught?.retryable).toBe(false);
    expect(caught?.httpStatus).toBe(422);
  });
});
