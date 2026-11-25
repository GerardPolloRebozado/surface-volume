import type { TriggerEvent } from '../../workflow';
import type { DriveFile } from './drive.client';

/** Maps a Drive file resource to the trigger's output shape. */
export function toFileEvent(f: DriveFile): TriggerEvent {
  const size = f.size !== undefined ? Number(f.size) : NaN;
  return {
    id: f.id,
    occurredAt: f.createdTime,
    data: {
      file_id: f.id,
      name: f.name ?? '',
      mime_type: f.mimeType ?? '',
      web_view_link: f.webViewLink ?? '',
      created_time: f.createdTime ?? '',
      // Shared-drive files have no owners.
      owner_email: f.owners?.[0]?.emailAddress ?? '',
      // Google-native files (Docs, Sheets, …) have no size.
      size: Number.isFinite(size) ? size : null,
    },
  };
}

/** Maps a modified Drive file to the file_updated output shape. */
export function toModifiedEvent(f: DriveFile): TriggerEvent {
  const user = f.lastModifyingUser;
  return {
    // One event per (file, revision time), so each edit fires exactly once.
    id: `${f.id}:${f.modifiedTime ?? ''}`,
    occurredAt: f.modifiedTime,
    data: {
      file_id: f.id,
      name: f.name ?? '',
      web_view_link: f.webViewLink ?? '',
      modified_time: f.modifiedTime ?? '',
      last_modifying_user: user?.emailAddress || user?.displayName || '',
    },
  };
}
