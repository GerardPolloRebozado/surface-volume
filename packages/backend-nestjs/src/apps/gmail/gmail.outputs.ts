import type { OutputField } from '../../workflow';

/** Outputs shared by every Gmail message trigger. */
export const emailOutputFields: OutputField[] = [
  { key: 'message_id', label: 'Message ID', type: 'string' },
  { key: 'thread_id', label: 'Thread ID', type: 'string' },
  { key: 'from', label: 'From', type: 'string' },
  { key: 'to', label: 'To', type: 'string' },
  { key: 'subject', label: 'Subject', type: 'string' },
  { key: 'snippet', label: 'Snippet', type: 'text' },
  { key: 'body_text', label: 'Body (plain text)', type: 'text' },
  { key: 'received_at', label: 'Received at', type: 'datetime' },
  { key: 'has_attachments', label: 'Has attachments', type: 'boolean' },
  { key: 'labels', label: 'Labels', type: 'json' },
];

export const emailSample: Record<string, unknown> = {
  message_id: '18c2f0a1b2c3d4e5',
  thread_id: '18c2f0a1b2c3d4e5',
  from: 'Accountant <accountant@example.com>',
  to: 'me@example.com',
  subject: 'Invoice #2026-11',
  snippet: 'Please find attached the invoice for November.',
  body_text: 'Hi,\n\nPlease find attached the invoice for November.\n',
  received_at: '2026-11-19T09:30:00.000Z',
  has_attachments: true,
  labels: ['INBOX', 'UNREAD'],
};
