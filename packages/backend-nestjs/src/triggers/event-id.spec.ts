import { createHash } from 'node:crypto';
import { externalIdForEvent } from './event-id';

describe('externalIdForEvent', () => {
  it('uses the provider id when present', () => {
    expect(externalIdForEvent({ id: 'video-1', data: {} })).toBe('video-1');
  });

  it('hashes the payload when the provider has no id', () => {
    const data = { videoId: 'abc' };
    const expected = createHash('sha256').update(JSON.stringify(data)).digest('hex');
    expect(externalIdForEvent({ id: '', data })).toBe(expected);
  });
});
