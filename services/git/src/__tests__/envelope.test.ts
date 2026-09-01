import { describe, it, expect } from 'vitest';
import { encryptToken, decryptToken } from '../crypto/envelope.js';

const TEST_KEY = 'a'.repeat(64);

describe('envelope encryption', () => {
  it('encrypts and decrypts a token correctly', () => {
    const plaintext = 'ghs_secret_installation_token_abc123';
    const enc = encryptToken(plaintext, TEST_KEY);
    expect(decryptToken(enc, TEST_KEY)).toBe(plaintext);
  });

  it('produces different ciphertexts for same plaintext (random IV + salt)', () => {
    const a = encryptToken('same-token', TEST_KEY);
    const b = encryptToken('same-token', TEST_KEY);
    expect(a.ciphertext).not.toBe(b.ciphertext);
    expect(a.iv).not.toBe(b.iv);
    expect(a.salt).not.toBe(b.salt);
  });

  it('fails decryption with wrong key', () => {
    const enc = encryptToken('secret', TEST_KEY);
    const wrongKey = 'b'.repeat(64);
    expect(() => decryptToken(enc, wrongKey)).toThrow();
  });

  it('fails decryption with tampered ciphertext', () => {
    const enc = encryptToken('secret', TEST_KEY);
    const tampered = { ...enc, ciphertext: Buffer.from('tampered-content').toString('base64') };
    expect(() => decryptToken(tampered, TEST_KEY)).toThrow();
  });

  it('fails decryption with tampered tag', () => {
    const enc = encryptToken('secret', TEST_KEY);
    const tampered = { ...enc, tag: Buffer.from('0000000000000000').toString('base64') };
    expect(() => decryptToken(tampered, TEST_KEY)).toThrow();
  });

  it('token never appears in plaintext in the encrypted form', () => {
    const token = 'ghs_very_secret_token_value';
    const enc = encryptToken(token, TEST_KEY);
    const encStr = JSON.stringify(enc);
    expect(encStr).not.toContain(token);
    expect(encStr).not.toContain('ghs_');
  });

  it('works with unicode and special chars in the token', () => {
    const token = 'Bearer eyJhbGc.iOiJSUzI1NiJ9.payload==';
    expect(decryptToken(encryptToken(token, TEST_KEY), TEST_KEY)).toBe(token);
  });
});
