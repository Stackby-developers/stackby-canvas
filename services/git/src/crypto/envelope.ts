import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const TAG_LENGTH = 16;

export interface EncryptedToken {
  ciphertext: string;
  iv: string;
  tag: string;
  salt: string;
}

function deriveKey(masterKeyHex: string, salt: Buffer): Buffer {
  return createHash('sha256')
    .update(Buffer.from(masterKeyHex, 'hex'))
    .update(salt)
    .digest();
}

export function encryptToken(plaintext: string, masterKeyHex: string): EncryptedToken {
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const key = deriveKey(masterKeyHex, salt);
  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH });
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf-8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    ciphertext: encrypted.toString('base64'),
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
    salt: salt.toString('base64'),
  };
}

export function decryptToken(encrypted: EncryptedToken, masterKeyHex: string): string {
  const salt = Buffer.from(encrypted.salt, 'base64');
  const iv = Buffer.from(encrypted.iv, 'base64');
  const tag = Buffer.from(encrypted.tag, 'base64');
  const key = deriveKey(masterKeyHex, salt);
  const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH });
  decipher.setAuthTag(tag);
  return decipher.update(encrypted.ciphertext, 'base64', 'utf-8') + decipher.final('utf-8');
}
