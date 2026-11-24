import { decryptJson, encryptJson } from './connection-cipher';

const key = Buffer.alloc(32, 7);

describe('connection cipher', () => {
  it('round-trips credentials', () => {
    const value = { accessToken: 'token', refreshToken: 'refresh' };
    expect(decryptJson(key, encryptJson(key, value))).toEqual(value);
  });

  it('uses a fresh IV for every encryption', () => {
    const a = encryptJson(key, { token: 'same' });
    const b = encryptJson(key, { token: 'same' });
    expect(a.equals(b)).toBe(false);
  });

  it('rejects tampered ciphertext', () => {
    const blob = encryptJson(key, { token: 'secret' });
    blob[blob.length - 1] ^= 1;
    expect(() => decryptJson(key, blob)).toThrow();
  });
});
