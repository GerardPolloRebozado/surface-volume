import { ActionError } from '../../workflow/actions.types';
import type { ActionImplementation } from '../../workflow/action.implementation';
import type { RunContext } from '../../workflow/context.types';

export const GMAIL_SEND_SCOPE = 'https://www.googleapis.com/auth/gmail.send';

const SEND_URL = 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send';

/** What the workflow passes into `send_email`. */
export interface SendEmailInputs extends Record<string, unknown> {
  to: string;
  subject: string;
  body: string;
}

/** What `send_email` gives back to the next node. */
export interface SendEmailOutputs extends Record<string, unknown> {
  message_id: string;
  thread_id: string;
}

/**
 * Gmail `send_email`.
 *
 * `fetchFn` is the HTTP call. Production uses the global `fetch`.
 * A test passes its own function and never contacts Gmail.
 */
export function sendEmailAction(
  fetchFn: typeof fetch = fetch,
): ActionImplementation<SendEmailInputs, SendEmailOutputs> {
  return {
    key: 'send_email',
    name: 'Send an email',
    description: 'Sends one email from the connected account.',
    inputFields: [
      { key: 'to', label: 'To', type: 'string', required: true },
      { key: 'subject', label: 'Subject', type: 'string', required: true },
      { key: 'body', label: 'Body', type: 'text', required: true },
    ],
    outputFields: [
      { key: 'message_id', label: 'Message ID', type: 'string' },
      { key: 'thread_id', label: 'Thread ID', type: 'string' },
    ],
    sample: { message_id: '18f2ca77e1', thread_id: '18f2c9a1b0' },
    async run(ctx) {
      const to = textField(ctx.inputs.to, 'to');
      const subject = textField(ctx.inputs.subject, 'subject');
      const body = textField(ctx.inputs.body, 'body');
      const token = accessToken(ctx);
      const response = await fetchFn(SEND_URL, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${token}`,
          accept: 'application/json',
          'content-type': 'application/json',
        },
        body: JSON.stringify({ raw: rawMessage(to, subject, body) }),
      });
      return readSentMessage(response);
    },
  };
}

function textField(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new ActionError(`Missing ${field}`, 'fatal');
  }
  if (field !== 'body' && (value.includes('\r') || value.includes('\n'))) {
    throw new ActionError(`${field} contains a line break`, 'fatal');
  }
  return value;
}

function accessToken(ctx: RunContext<SendEmailInputs>): string {
  if (
    ctx.credential?.status === 'expired' ||
    ctx.credential?.status === 'revoked'
  ) {
    throw new ActionError('Gmail connection is not active', 'auth_expired');
  }
  const token = ctx.credential?.credentials?.accessToken;
  if (typeof token !== 'string' || token.length === 0) {
    throw new ActionError('Missing Gmail access token', 'auth_expired');
  }
  return token;
}

/** One RFC 2822 message, base64url-encoded, which is the `raw` body Gmail expects. */
function rawMessage(to: string, subject: string, body: string): string {
  const message = [
    `To: ${to}`,
    `Subject: ${encodeSubject(subject)}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=utf-8',
    '',
    body,
  ].join('\r\n');
  return Buffer.from(message, 'utf8').toString('base64url');
}

function encodeSubject(subject: string): string {
  if (/^[\u0020-\u007e]*$/.test(subject)) {
    return subject;
  }
  return `=?UTF-8?B?${Buffer.from(subject, 'utf8').toString('base64')}?=`;
}

async function readSentMessage(response: Response): Promise<SendEmailOutputs> {
  if (response.status === 401 || response.status === 403) {
    throw new ActionError('Gmail rejected the token', 'auth_expired');
  }
  if (response.status === 429) {
    throw new ActionError('Gmail rate limit', 'rate_limited');
  }
  if (!response.ok) {
    throw new ActionError(
      `Gmail status ${response.status}`,
      response.status >= 500 ? 'retryable' : 'fatal',
    );
  }
  const payload: unknown = await response.json();
  if (typeof payload !== 'object' || payload === null) {
    throw new ActionError('Gmail response was not an object', 'retryable');
  }
  const sent = payload as { id?: unknown; threadId?: unknown };
  if (typeof sent.id !== 'string' || typeof sent.threadId !== 'string') {
    throw new ActionError('Gmail response missed the message ids', 'retryable');
  }
  return { message_id: sent.id, thread_id: sent.threadId };
}
