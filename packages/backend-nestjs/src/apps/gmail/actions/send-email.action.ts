import {
  ActionError,
  type ActionDefinition,
  type RunContext,
} from '../../../workflow';
import type { ActionPlan } from '../../../workflow/action-plan';
import { getAccessToken } from '../gmail.client';

export const GMAIL_SEND_SCOPE = 'https://www.googleapis.com/auth/gmail.send';

const SEND_URL = 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send';

/**
 * Gmail `send_email`.
 *
 * `plan` is what the workflow worker runs: one POST of a base64url RFC 2822
 * message. `run` does the same call inside NestJS for a direct check.
 */
export const sendEmailAction: ActionDefinition = {
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

  plan(ctx): ActionPlan {
    const token = getAccessToken(ctx);
    const message = readMessage(ctx);
    return {
      calls: [
        {
          id: 'send',
          method: 'POST',
          url: SEND_URL,
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: { raw: rawMessage(message) },
          outputs: {
            message_id: '$.id',
            thread_id: '$.threadId',
          },
        },
      ],
    };
  },

  async run(ctx) {
    const token = getAccessToken(ctx);
    const message = readMessage(ctx);
    let response: Response;
    try {
      response = await fetch(SEND_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ raw: rawMessage(message) }),
      });
    } catch (error) {
      throw new ActionError(
        `Gmail request failed: ${(error as Error).message}`,
        'retryable',
      );
    }
    return readSentMessage(response);
  },
};

function readMessage(ctx: RunContext): {
  to: string;
  subject: string;
  body: string;
} {
  return {
    to: headerValue(textField(ctx.inputs?.to, 'to'), 'to'),
    subject: headerValue(textField(ctx.inputs?.subject, 'subject'), 'subject'),
    body: textField(ctx.inputs?.body, 'body'),
  };
}

function textField(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new ActionError(`Missing ${field}`, 'fatal');
  }
  return value;
}

function headerValue(value: string, field: string): string {
  if (value.includes('\r') || value.includes('\n')) {
    throw new ActionError(`${field} contains a line break`, 'fatal');
  }
  return value;
}

/** One RFC 2822 message, base64url-encoded, which is the `raw` body Gmail expects. */
function rawMessage(input: {
  to: string;
  subject: string;
  body: string;
}): string {
  const message = [
    `To: ${input.to}`,
    `Subject: ${encodeSubject(input.subject)}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=utf-8',
    '',
    input.body,
  ].join('\r\n');
  return Buffer.from(message, 'utf8').toString('base64url');
}

function encodeSubject(subject: string): string {
  if (/^[\u0020-\u007e]*$/.test(subject)) {
    return subject;
  }
  return `=?UTF-8?B?${Buffer.from(subject, 'utf8').toString('base64')}?=`;
}

async function readSentMessage(
  response: Response,
): Promise<Record<string, unknown>> {
  if (response.status === 401 || response.status === 403) {
    throw new ActionError('Gmail rejected the token', 'auth_expired');
  }
  if (response.status === 429) {
    const retryAfter = Number(response.headers.get('retry-after'));
    throw new ActionError(
      'Gmail rate limit',
      'rate_limited',
      Number.isFinite(retryAfter) && retryAfter > 0
        ? retryAfter * 1000
        : undefined,
    );
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
