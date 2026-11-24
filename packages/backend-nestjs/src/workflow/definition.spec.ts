import { assertRunnable, validateDefinition } from './definition';

const valid = {
  trigger: { id: 'trigger', appId: 'mastodon', triggerKey: 'new_notification', credentialId: 'connection-1', inputs: {} },
  nodes: [
    {
      id: 'reply',
      type: 'action',
      appId: 'mastodon',
      actionKey: 'post_status',
      credentialId: 'connection-1',
      inputs: { status: 'hello' },
    },
  ],
  links: [{ id: 'link-1', from: 'trigger', to: 'reply' }],
};

describe('workflow definitions', () => {
  it('accepts a connected graph', () => {
    const definition = validateDefinition(valid);
    expect(definition.nodes).toHaveLength(1);
    expect(() => assertRunnable(definition)).not.toThrow();
  });

  it('rejects links to unknown nodes', () => {
    expect(() =>
      validateDefinition({
        ...valid,
        links: [{ id: 'link-1', from: 'trigger', to: 'missing' }],
      }),
    ).toThrow(/link/);
  });

  it('rejects duplicate node ids', () => {
    expect(() =>
      validateDefinition({
        ...valid,
        nodes: [valid.nodes[0], { ...valid.nodes[0] }],
      }),
    ).toThrow(/unique id/);
  });

  it('rejects unreachable nodes and uninstalled triggers', () => {
    expect(() =>
      assertRunnable(
        validateDefinition({
          ...valid,
          trigger: { ...valid.trigger, triggerKey: 'unknown' },
        }),
      ),
    ).toThrow(/not installed/);
    expect(() =>
      assertRunnable(
        validateDefinition({
          ...valid,
          links: [],
        }),
      ),
    ).toThrow(/not connected/);
  });
});
