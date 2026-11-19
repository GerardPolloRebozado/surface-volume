import type { GmailMessage } from './gmail.client';
import { extractBodyText, hasAttachments, toEmailEvent } from './gmail.parse';

const b64 = (s: string) => Buffer.from(s, 'utf8').toString('base64url');

describe('gmail.parse', () => {
  const multipart: GmailMessage = {
    id: 'm1',
    threadId: 't1',
    labelIds: ['INBOX', 'UNREAD'],
    snippet: 'Hello there',
    internalDate: '1763544600000',
    payload: {
      mimeType: 'multipart/mixed',
      headers: [
        { name: 'from', value: 'Boss <boss@company.com>' },
        { name: 'TO', value: 'me@example.com' },
        { name: 'Subject', value: 'Invoice' },
      ],
      parts: [
        {
          mimeType: 'multipart/alternative',
          parts: [
            { mimeType: 'text/plain', body: { data: b64('Hello ✓ plain') } },
            { mimeType: 'text/html', body: { data: b64('<p>Hello</p>') } },
          ],
        },
        {
          mimeType: 'application/pdf',
          filename: 'invoice.pdf',
          body: { attachmentId: 'att1', size: 1234 },
        },
      ],
    },
  };

  it('maps every output field', () => {
    expect(toEmailEvent(multipart)).toEqual({
      id: 'm1',
      occurredAt: '2025-11-19T09:30:00.000Z',
      data: {
        message_id: 'm1',
        thread_id: 't1',
        from: 'Boss <boss@company.com>',
        to: 'me@example.com',
        subject: 'Invoice',
        snippet: 'Hello there',
        body_text: 'Hello ✓ plain',
        received_at: '2025-11-19T09:30:00.000Z',
        has_attachments: true,
        labels: ['INBOX', 'UNREAD'],
      },
    });
  });

  it('falls back to stripped HTML when there is no text/plain part', () => {
    const msg: GmailMessage = {
      id: 'm2',
      threadId: 't2',
      payload: {
        mimeType: 'text/html',
        body: {
          data: b64(
            '<style>p{}</style><p>Hi &amp; welcome</p><div>Line<br>two</div>',
          ),
        },
      },
    };
    expect(extractBodyText(msg)).toBe('Hi & welcome\nLine\ntwo');
    expect(hasAttachments(msg)).toBe(false);
  });

  it('handles a message without payload', () => {
    const event = toEmailEvent({ id: 'm3', threadId: 't3' });
    expect(event.data).toMatchObject({
      from: '',
      subject: '',
      body_text: '',
      has_attachments: false,
      labels: [],
    });
  });
});
