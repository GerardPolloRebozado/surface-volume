/// <reference types="jest" />
import { sendEmailAction } from './send-email.action';
import type { RunContext } from '../../workflow/context.types';
import type { SendEmailInputs } from './send-email.action';

function context(
  inputs: SendEmailInputs,
  token?: string,
): RunContext<SendEmailInputs> {
  return {
    inputs,
    credential:
      token === undefined
        ? undefined
        : {
            id: 'conn',
            userId: 'user',
            appId: 'gmail',
            displayName: 'Ada',
            credentials: { accessToken: token },
            status: 'active',
          },
    store: {
      get: async () => undefined,
      set: async () => undefined,
      delete: async () => undefined,
    },
  };
}

describe('send_email', () => {
  const inputs: SendEmailInputs = {
    to: 'ada@example.com',
    subject: 'New album',
    body: 'Hello',
  };

  it('posts one RFC 2822 message and returns the Gmail ids', async () => {
    let url = '';
    let init: RequestInit = {};
    const fetchFn: typeof fetch = async (input, requestInit) => {
      url = String(input);
      init = requestInit ?? {};
      return new Response(
        JSON.stringify({ id: 'msg-1', threadId: 'thread-1' }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    };
    const action = sendEmailAction(fetchFn);
    const outputs = await action.run(context(inputs, 'token'));

    expect(outputs).toEqual({ message_id: 'msg-1', thread_id: 'thread-1' });
    expect(url).toBe(
      'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
    );
    const headers = init.headers as Record<string, string>;
    expect(headers.authorization).toBe('Bearer token');
    const raw = JSON.parse(String(init.body)).raw as string;
    const message = Buffer.from(raw, 'base64url').toString('utf8');
    expect(message).toContain('To: ada@example.com');
    expect(message).toContain('Subject: New album');
    expect(message).toContain('Hello');
  });

  it('fails before calling Gmail when the connection has no token', async () => {
    let called = false;
    const fetchFn: typeof fetch = async () => {
      called = true;
      return new Response(null, { status: 500 });
    };
    const action = sendEmailAction(fetchFn);
    await expect(action.run(context(inputs))).rejects.toMatchObject({
      kind: 'auth_expired',
    });
    expect(called).toBe(false);
  });
});
