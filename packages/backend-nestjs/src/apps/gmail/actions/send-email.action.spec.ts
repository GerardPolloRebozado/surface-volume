import { sendEmailAction } from './send-email.action';
import type { ActionPlan } from '../../../workflow/action-plan';
import type { RunContext } from '../../../workflow';

const context: RunContext = {
  inputs: {
    to: 'ada@example.com',
    subject: 'New album',
    body: 'Hello',
  },
  credential: {
    id: 'conn',
    userId: 'user',
    appId: 'gmail',
    displayName: 'Ada',
    status: 'active',
    credentials: { accessToken: 'secret-token' },
  },
  store: {
    get: async () => undefined,
    set: async () => undefined,
    delete: async () => undefined,
  },
};

describe('gmail send_email action', () => {
  it('plans one POST whose raw body is the RFC 2822 message', () => {
    const plan = sendEmailAction.plan!(context) as ActionPlan;
    expect(plan.calls).toHaveLength(1);
    const call = plan.calls[0];
    expect(call.method).toBe('POST');
    expect(call.url).toBe(
      'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
    );
    expect(call.headers?.Authorization).toBe('Bearer secret-token');
    expect(call.outputs).toEqual({
      message_id: '$.id',
      thread_id: '$.threadId',
    });
    const raw = (call.body as { raw: string }).raw;
    const message = Buffer.from(raw, 'base64url').toString('utf8');
    expect(message).toContain('To: ada@example.com');
    expect(message).toContain('Subject: New album');
    expect(message).toContain('Hello');
    expect(JSON.stringify(call.body)).not.toContain('secret-token');
  });

  it('refuses to plan when the connection has no token', () => {
    expect(() =>
      sendEmailAction.plan!({ ...context, credential: undefined }),
    ).toThrow(expect.objectContaining({ kind: 'auth_expired' }));
  });
});
