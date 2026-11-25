import type { RunContext } from '../../workflow';
import {
  escapeQueryValue,
  FOLDER_MIME,
  getAccessToken,
  listFiles,
  listFolders,
} from './drive.client';

type Choice = { value: string; label: string };

/** `folder_id` choices: My Drive root, then the user's folders by name. */
export async function folderChoices(ctx: RunContext): Promise<Choice[]> {
  const folders = await listFolders(getAccessToken(ctx));
  return [
    { value: 'root', label: 'My Drive (root)' },
    ...folders.map((f) => ({ value: f.id, label: f.name ?? f.id })),
  ];
}

/** `file_id` choices: the (non-folder) files directly inside `inputs.folder_id`. */
export async function fileChoices(ctx: RunContext): Promise<Choice[]> {
  const folderId = String(ctx.inputs?.folder_id ?? '').trim();
  if (!folderId) return [];
  const { files } = await listFiles(
    getAccessToken(ctx),
    `'${escapeQueryValue(folderId)}' in parents and trashed = false and mimeType != '${FOLDER_MIME}'`,
    { maxPages: 3, orderBy: 'name', fields: 'id,name' },
  );
  return files.map((f) => ({ value: f.id, label: f.name ?? f.id }));
}
