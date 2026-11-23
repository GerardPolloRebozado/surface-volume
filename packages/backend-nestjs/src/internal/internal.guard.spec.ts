import { verifyToken } from './verify-token';

describe('verifyToken', () => {
  it('accepts the configured token', () => {
    expect(verifyToken('secret', 'secret')).toBe(true);
  });

  it('rejects a wrong token', () => {
    expect(verifyToken('nope', 'secret')).toBe(false);
  });

  it('rejects a missing token or a missing configuration', () => {
    expect(verifyToken(undefined, 'secret')).toBe(false);
    expect(verifyToken('secret', undefined)).toBe(false);
  });

  it('rejects a token of a different length', () => {
    expect(verifyToken('secret-long', 'secret')).toBe(false);
  });
});
