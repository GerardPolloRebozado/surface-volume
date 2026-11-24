import { assertSafeBaseUrl } from './egress';

describe('instance URL validation', () => {
  beforeEach(() => {
    delete process.env.ALLOW_PRIVATE_EGRESS;
  });

  it('accepts a public https instance', () => {
    expect(assertSafeBaseUrl('https://mastodon.social/')).toBe('https://mastodon.social');
  });

  it('rejects plain http and local addresses', () => {
    expect(() => assertSafeBaseUrl('http://mastodon.social')).toThrow();
    expect(() => assertSafeBaseUrl('https://localhost:9090')).toThrow();
    expect(() => assertSafeBaseUrl('https://127.0.0.1')).toThrow();
    expect(() => assertSafeBaseUrl('https://192.168.1.10')).toThrow();
  });

  it('allows a local mock when explicitly enabled', () => {
    process.env.ALLOW_PRIVATE_EGRESS = '1';
    expect(assertSafeBaseUrl('http://127.0.0.1:9091')).toBe('http://127.0.0.1:9091');
  });
});
