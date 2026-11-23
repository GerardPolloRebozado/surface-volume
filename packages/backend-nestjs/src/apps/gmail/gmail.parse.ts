import type { TriggerEvent } from '../../workflow';
import type { GmailMessage, GmailMessagePart } from './gmail.client';

function header(msg: GmailMessage, name: string): string {
  const lower = name.toLowerCase();
  return (
    msg.payload?.headers?.find((h) => h.name.toLowerCase() === lower)?.value ??
    ''
  );
}

function decodeBase64Url(data: string): string {
  return Buffer.from(data, 'base64url').toString('utf8');
}

function* walkParts(
  part: GmailMessagePart | undefined,
): Generator<GmailMessagePart> {
  if (!part) return;
  yield part;
  for (const child of part.parts ?? []) yield* walkParts(child);
}

function findBody(msg: GmailMessage, mimeType: string): string | undefined {
  for (const part of walkParts(msg.payload)) {
    if (part.mimeType === mimeType && !part.filename && part.body?.data) {
      return decodeBase64Url(part.body.data);
    }
  }
  return undefined;
}

function htmlToText(html: string): string {
  return html
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|tr|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function extractBodyText(msg: GmailMessage): string {
  const plain = findBody(msg, 'text/plain');
  if (plain !== undefined) return plain;
  const html = findBody(msg, 'text/html');
  return html !== undefined ? htmlToText(html) : '';
}

export function hasAttachments(msg: GmailMessage): boolean {
  for (const part of walkParts(msg.payload)) {
    if (part.filename && part.body?.attachmentId) return true;
  }
  return false;
}

/** Maps a Gmail `format=full` message to the trigger's output shape. */
export function toEmailEvent(msg: GmailMessage): TriggerEvent {
  const receivedAt = new Date(Number(msg.internalDate ?? 0)).toISOString();
  return {
    id: msg.id,
    occurredAt: receivedAt,
    data: {
      message_id: msg.id,
      thread_id: msg.threadId,
      from: header(msg, 'From'),
      to: header(msg, 'To'),
      subject: header(msg, 'Subject'),
      snippet: msg.snippet ?? '',
      body_text: extractBodyText(msg),
      received_at: receivedAt,
      has_attachments: hasAttachments(msg),
      labels: msg.labelIds ?? [],
    },
  };
}
