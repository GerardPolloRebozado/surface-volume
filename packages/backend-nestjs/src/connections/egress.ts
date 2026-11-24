import { isIP } from 'node:net';

function privateIpv4(host: string): boolean {
  const parts = host.split('.').map(Number);
  if (parts.length !== 4) return false;
  const [a, b] = parts;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    a === 169 && b === 254 ||
    a === 172 && b >= 16 && b <= 31 ||
    a === 192 && b === 168
  );
}

function privateIpv6(host: string): boolean {
  const value = host.toLowerCase();
  return (
    value === '::1' ||
    value.startsWith('fc') ||
    value.startsWith('fd') ||
    value.startsWith('fe80') ||
    value.startsWith('::ffff:') && privateIpv4(value.slice(7))
  );
}

export function assertSafeBaseUrl(value: string): string {
  const url = new URL(value.trim());
  const allowPrivate = process.env.ALLOW_PRIVATE_EGRESS === '1';

  if (url.protocol !== 'https:') {
    if (!allowPrivate || url.protocol !== 'http:') {
      throw new Error('The instance URL must use https');
    }
  }
  if (url.username || url.password) {
    throw new Error('The instance URL must not contain credentials');
  }

  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  const local = host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local');
  const literal = isIP(host);
  const privateAddress =
    literal === 4 ? privateIpv4(host) : literal === 6 ? privateIpv6(host) : false;

  if (!allowPrivate && (local || privateAddress)) {
    throw new Error('The instance URL must point to a public host');
  }

  return url.toString().replace(/\/$/, '');
}
