/**
 * Runs a Drive trigger (new file in folder, or file updated) once against a real account,
 * keeping its state between runs.
 *
 *   npm run try:drive -- --folders                 # list folder IDs to pick from
 *   npm run try:drive -- <folder_id> [--mime pdf]  # poll (first run = baseline)
 *   npm run try:drive -- <folder_id> --test        # preview, no state change
 *   npm run try:drive -- <folder_id> --reset       # forget saved state
 *   npm run try:drive -- <folder_id> --updated [--file <file_id>]  # file_updated trigger
 */
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { fileUpdated } from '../src/apps/drive/triggers/file-updated.trigger';
import { newFileInFolder } from '../src/apps/drive/triggers/new-file-in-folder.trigger';
import type { KeyValueStore, RunContext } from '../src/workflow';

const STATE_DIR = join(__dirname, '..', '.drive-trigger-state');

function usage(message?: string): never {
  if (message) console.error(`${message}\n`);
  console.error(
    [
      'Usage:',
      '  npm run try:drive -- --folders',
      '  npm run try:drive -- <folder_id> [--mime any|document|spreadsheet|pdf|image] [--test] [--reset]',
      '  npm run try:drive -- <folder_id> --updated [--file <file_id>] [--test] [--reset]',
      '',
      'Needs DRIVE_TOKEN set to an access token with the drive.readonly scope.',
    ].join('\n'),
  );
  process.exit(1);
}

async function main() {
  const args = process.argv.slice(2);
  const takeOption = (name: string) => {
    const i = args.indexOf(name);
    return i >= 0 ? args.splice(i, 2)[1] : undefined;
  };
  const mime = takeOption('--mime') ?? 'any';
  const fileId = takeOption('--file') ?? '';
  const flags = new Set(args.filter((a) => a.startsWith('--')));
  const [folderId] = args.filter((a) => !a.startsWith('--'));
  if (!folderId && !flags.has('--folders')) usage('Missing folder ID.');
  const trigger = flags.has('--updated') ? fileUpdated : newFileInFolder;

  const stateFile = join(
    STATE_DIR,
    `${trigger.key}-${folderId}-${flags.has('--updated') ? fileId || 'all' : mime}.json`,
  );
  if (flags.has('--reset')) {
    rmSync(stateFile, { force: true });
    console.log(`Forgot saved state for folder ${folderId} (${mime}).`);
    return;
  }

  const token = process.env.DRIVE_TOKEN;
  if (!token) usage('DRIVE_TOKEN is not set.');

  const state: Record<string, unknown> = existsSync(stateFile)
    ? JSON.parse(readFileSync(stateFile, 'utf8'))
    : {};
  const store: KeyValueStore = {
    get: async <T>(key: string) => state[key] as T | undefined,
    set: async (key, value) => void (state[key] = value),
    delete: async (key) => void delete state[key],
  };
  const ctx: RunContext = {
    inputs: { folder_id: folderId, mime_type: mime, file_id: fileId },
    store,
    credential: {
      id: 'manual',
      userId: 'manual',
      appId: 'drive',
      displayName: 'manual test',
      credentials: { accessToken: token },
      status: 'active',
    },
  };

  if (flags.has('--folders')) {
    const choices = await trigger.inputFields[0].dynamicChoices!(ctx);
    for (const c of choices) console.log(`${c.value}\t${c.label}`);
    return;
  }

  const preview = flags.has('--test');
  const firstRun = !preview && Object.keys(state).length === 0;
  const events = preview ? await trigger.test!(ctx) : await trigger.poll(ctx);

  if (!preview) {
    mkdirSync(STATE_DIR, { recursive: true });
    writeFileSync(stateFile, JSON.stringify(state, null, 2));
  }

  if (firstRun) {
    console.log('First run: saved a starting point. Nothing fires yet.');
    console.log('Now add/move (or edit, with --updated) a file and run again.');
    return;
  }
  console.log(
    `${events.length} ${preview ? 'file(s) (preview)' : 'new event(s)'}`,
  );
  for (const e of events) console.log(JSON.stringify(e.data, null, 2));
}

main().catch((err: { kind?: string; message?: string }) => {
  console.error(`Error [${err.kind ?? 'unknown'}]: ${err.message}`);
  if (err.kind === 'auth_expired') {
    console.error('Your token is missing or expired: get a new one.');
  }
  process.exit(1);
});
