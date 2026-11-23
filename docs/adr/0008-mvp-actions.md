# ADR 0008 - MVP actions

- Status: **Proposed**
- Date: 2026-11-18
- Checked against `main`: 2026-11-21
- Deciders: the whole team

In the subject a REAction is the task. The tickets call that an action. This record uses the ticket word.

## Context

The MVP hand-in (1 December 2026) must run one workflow end to end: one trigger, at least two actions, and one condition. It does not require every service.

[ADR 0007](0007-triggers.md) is now on `main`, with the specs in `docs/software/triggers/`. It keeps Gmail, Spotify, Twitch, and Timer on the MVP milestone, and its own example is "new release → add it to a playlist". Spotify `new_artist_release` still publishes `album_type` and `track_uris`. `spotify.md` already reserves `playlist-modify-public` and `playlist-modify-private` for that action. Timer has no write API.

The action contract is unchanged: `ActionDefinition` is `key`, inputs, outputs, a sample, and `run(ctx)`. A connection stores an OAuth2 token plus a scope list (`Connection.scopes`). Each action node carries its own `credentialId`.

## Decision

The MVP workflow is:

1. Trigger: Spotify `new_artist_release`.
2. Condition: `album_type` equals `album`, as a branch node (`op: eq`). Both actions sit on that branch, in order. The other branch ends. Branches do not merge ([ADR 0007](0007-workflow-versioned-jsonb.md)).
3. Action: Spotify `add_tracks_to_playlist`.
4. Action: Gmail `send_email`.

| Key                      | Service | Auth to add                                                                              | Inputs                                                                      | Outputs                      |
| ------------------------ | ------- | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ---------------------------- |
| `add_tracks_to_playlist` | Spotify | `playlist-modify-public`, `playlist-modify-private` on the same OAuth app as the trigger | `playlist_id` (required), `track_uris` (required, `list`, from the trigger) | `playlist_id`, `snapshot_id` |
| `send_email`             | Gmail   | `https://www.googleapis.com/auth/gmail.send`                                             | `to` (required), `subject` (required), `body` (required)                    | `message_id`, `thread_id`    |

`add_tracks_to_playlist` calls `POST /playlists/{id}/tracks` with the trigger's `track_uris`. `send_email` calls `users.messages.send` with one RFC 2822 message. The mail tells the user the album name and the Spotify link.

## Alternatives rejected

- **GitHub comment plus a Discord webhook**, as in `docs/organization/PLAN.md`. Those services are not in the merged trigger set. The wireframe catalogue still shows them. That catalogue is mock data, and it is not the service list.
- **Both actions on Spotify** (`add_tracks_to_playlist` and `save_to_library`). This meets the count of two, and it stays on one OAuth app. It does not show the product connecting two services.
- **Twitch** `send_chat_message` **as the second action.** The Twitch triggers need a public HTTPS callback on port 443. Chat write also needs `user:write:chat` and only works in a channel where the connected user may speak. The 1 December demo should not depend on that.

Gmail `add_label`, Spotify `save_to_library`, and both Twitch actions stay in the catalogue. They are not part of this hand-in. Drive, Notion, Slack, and Calendar stay on the Final milestone with their triggers. Those twelve actions are [ADR 0009](0009-remaining-actions.md). Timer stays trigger-only.

## Consequences

- Spotify stays in development mode. Demo accounts have to be on the app allowlist. ADR 0007 already records this. The playlist scopes are added to that same app. One Spotify connection then serves the trigger and the playlist action.
- Gmail send is a restricted scope. The Google Cloud app stays in testing, and every account that sends mail has to be a test user. This workflow does not read mail, so this connection asks for `gmail.send` only. The Gmail triggers stay on `gmail.readonly` and use their own grant if both are connected later.
- The first poll of `new_artist_release` records a baseline and does not fire. The demo uses the trigger `test` hook, or a release that appears after the workflow is enabled.
- Spotify accepts at most 100 track URIs per call. A longer album is sent in batches of 100.
- [#40](https://github.com/GerardPolloRebozado/surface-volume/issues/40) is these two actions. The other MVP services do not need an action issue for 1 December.
- `docs/organization/PLAN.md` still says GitHub and Discord for the MVP. If this record is accepted, that table is updated to match, and the change is explained in the plan note the hand-in asks for.
