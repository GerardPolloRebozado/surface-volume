import { findAction, findApp, findTrigger } from './index';

describe('app catalogue', () => {
  it('finds the gmail app and its triggers', () => {
    expect(findApp('gmail')?.id).toBe('gmail');
    expect(findTrigger('gmail', 'new_starred_email')?.key).toBe(
      'new_starred_email',
    );
  });

  it('returns undefined for unknown apps and keys', () => {
    expect(findApp('unknown')).toBeUndefined();
    expect(findTrigger('gmail', 'unknown')).toBeUndefined();
    expect(findAction('gmail', 'unknown')).toBeUndefined();
  });
});
