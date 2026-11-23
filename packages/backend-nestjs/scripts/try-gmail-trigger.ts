/**
 * Runs a Gmail trigger once against a real inbox, keeping its state between runs.
 * See src/apps/gmail/README.md for the full walkthrough.
 *
 *   npm run try:gmail -- search "subject:area-test"
 *   npm run try:gmail -- starred
 *   npm run try:gmail -- search "subject:area-test" --test   # preview, no state change
 *   npm run try:gmail -- starred --reset                      # forget saved state
 */
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { newEmailMatchingSearch } from '../src/apps/gmail/triggers/new-email-matching-search.trigger';
import { newStarredEmail } from '../src/apps/gmail/triggers/new-starred-email.trigger';
import type {
  KeyValueStore,
  PollingTrigger,
  RunContext,
} from '../src/workflow';

const TRIGGERS: Record<string, PollingTrigger> = {
  search: newEmailMatchingSearch,
  starred: newStarredEmail,
};
const STATE_DIR = join(__dirname, '..', '.gmail-trigger-state');

function usage(message?: string): never {
  if (message) console.error(`${message}\n`);
  console.error(
    [
      'Usage:',
      '  npm run try:gmail -- search "<gmail query>" [--test] [--reset]',
      '  npm run try:gmail -- starred [--test] [--reset]',
      '',
      'Needs GMAIL_TOKEN set to an access token with the gmail.readonly scope.',
    ].join('\n'),
  );
  process.exit(1);
}

async function main() {
  const args = process.argv.slice(2);
  const flags = new Set(args.filter((a) => a.startsWith('--')));
  const [name, query = ''] = args.filter((a) => !a.startsWith('--'));
  const trigger = TRIGGERS[name];
  if (!trigger)
    usage(`Unknown trigger "${name ?? ''}". Use "search" or "starred".`);
  if (name === 'search' && !query.trim())
    usage('The search trigger needs a Gmail query.');

  const stateFile = join(STATE_DIR, `${trigger.key}.json`);
  if (flags.has('--reset')) {
    rmSync(stateFile, { force: true });
    console.log(`Forgot saved state for ${trigger.key}.`);
    return;
  }

  const token = process.env.GMAIL_TOKEN;
  if (!token) usage('GMAIL_TOKEN is not set.');

  const state: Record<string, unknown> = existsSync(stateFile)
    ? JSON.parse(readFileSync(stateFile, 'utf8'))
    : {};
  const store: KeyValueStore = {
    get: async <T>(key: string) => state[key] as T | undefined,
    set: async (key, value) => void (state[key] = value),
    delete: async (key) => void delete state[key],
  };
  const ctx: RunContext = {
    inputs: { query },
    store,
    credential: {
      id: 'manual',
      userId: 'manual',
      appId: 'gmail',
      displayName: 'manual test',
      credentials: { accessToken: token },
      status: 'active',
    },
  };

  const preview = flags.has('--test');
  const firstRun = !preview && Object.keys(state).length === 0;
  const events = preview ? await trigger.test!(ctx) : await trigger.poll(ctx);

  if (!preview) {
    mkdirSync(STATE_DIR, { recursive: true });
    writeFileSync(stateFile, JSON.stringify(state, null, 2));
  }

  if (firstRun) {
    console.log(
      'First run: saved the current emails as a starting point. Nothing fires yet.',
    );
    console.log('Now send/star an email and run the same command again.');
    return;
  }
  console.log(
    `${events.length} ${preview ? 'matching email(s) (preview)' : 'new event(s)'}`,
  );
  for (const e of events) {
    const data = {
      ...e.data,
      body_text: String(e.data.body_text).slice(0, 200),
    };
    console.log(JSON.stringify(data, null, 2));
  }
}

main().catch((err: { kind?: string; message?: string }) => {
  console.error(`Error [${err.kind ?? 'unknown'}]: ${err.message}`);
  if (err.kind === 'auth_expired') {
    console.error(
      'Your token is missing or expired: get a new one (see src/apps/gmail/README.md).',
    );
  }
  process.exit(1);
});
