/**
 * AES-256-GCM encryption helpers for CRM API tokens
 * Each encrypted value gets a unique IV and auth tag (anti-tampering)
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { env } from './env.js';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits recommended for GCM
const TAG_LENGTH = 16; // 128 bits

/** Master key derived from hex env var (32 bytes) */
const masterKey = Buffer.from(env.ENCRYPTION_MASTER_KEY, 'hex');

/**
 * Encrypt a plaintext string
 * @param {string} plaintext
 * @returns {{ encrypted: Buffer, iv: Buffer, tag: Buffer }}
 */
export function encrypt(plaintext) {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, masterKey, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);

  const tag = cipher.getAuthTag();

  return { encrypted, iv, tag };
}

/**
 * Decrypt an encrypted buffer back to plaintext
 * @param {Buffer} encrypted
 * @param {Buffer} iv
 * @param {Buffer} tag
 * @returns {string}
 */
export function decrypt(encrypted, iv, tag) {
  const decipher = createDecipheriv(ALGORITHM, masterKey, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
}
