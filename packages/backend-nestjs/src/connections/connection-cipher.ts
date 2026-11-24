import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

export function encryptJson(key: Buffer, value: unknown): Buffer {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const payload = Buffer.concat([
    cipher.update(JSON.stringify(value), 'utf8'),
    cipher.final(),
  ]);

  return Buffer.concat([iv, cipher.getAuthTag(), payload]);
}

export function decryptJson(key: Buffer, blob: Uint8Array): Record<string, unknown> {
  const data = Buffer.from(blob);
  const decipher = createDecipheriv('aes-256-gcm', key, data.subarray(0, 12));
  decipher.setAuthTag(data.subarray(12, 28));

  const plain = Buffer.concat([
    decipher.update(data.subarray(28)),
    decipher.final(),
  ]);

  return JSON.parse(plain.toString('utf8')) as Record<string, unknown>;
}
