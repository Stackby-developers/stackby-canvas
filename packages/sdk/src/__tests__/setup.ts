import { vi } from 'vitest';

// Polyfill crypto.randomUUID for happy-dom
if (typeof crypto === 'undefined' || !crypto.randomUUID) {
  let counter = 0;
  vi.stubGlobal('crypto', {
    randomUUID: () => `00000000-0000-0000-0000-${String(++counter).padStart(12, '0')}`,
  });
}
