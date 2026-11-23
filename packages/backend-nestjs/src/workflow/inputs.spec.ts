import { resolveInputs } from './inputs';

const outputs = {
  trigger: { video: { id: 'abc-123', title: 'Hello' } },
  a1: { count: 7 },
};

describe('resolveInputs', () => {
  it('resolves a nested reference', () => {
    expect(resolveInputs({ id: '{{ trigger.video.id }}' }, outputs)).toEqual({
      id: 'abc-123',
    });
  });

  it('keeps the original type for a standalone reference', () => {
    expect(resolveInputs({ count: '{{ a1.count }}' }, outputs)).toEqual({
      count: 7,
    });
  });

  it('interpolates a reference inside a string', () => {
    expect(resolveInputs({ text: 'video {{ trigger.video.title }}' }, outputs)).toEqual({
      text: 'video Hello',
    });
  });

  it('recurses into arrays and objects, and blanks missing paths', () => {
    expect(
      resolveInputs(
        { items: [{ id: '{{ trigger.video.id }}' }], missing: '{{ nope.value }}' },
        outputs,
      ),
    ).toEqual({ items: [{ id: 'abc-123' }], missing: '' });
  });
});
