# ADR 0009 - Actions after the MVP

- Status: **Proposed**
- Date: 2026-11-23
- Deciders: the whole team (not accepted yet)

In the subject a REAction is the task. The tickets call that an action. This record uses the ticket word.

## Context

[ADR 0008](0008-mvp-actions.md) keeps the 1 December workflow to two actions: Spotify `add_tracks_to_playlist` and Gmail `send_email`. The trigger set in [ADR 0007](0007-triggers.md) is eight services, two triggers each. Timer has no write API. The other services, and the second action on Gmail, Spotify, and Twitch, are still part of the catalogue.

The final defense has to show one workflow with at least four action nodes. The specs for every action are in [`docs/software/actions`](../software/actions/actions.md). Each one is an `ActionDefinition`: inputs, outputs, and `run(ctx)`.

## Decision

These twelve actions are implemented after 1 December. They are not part of the MVP workflow.

| Service | Key | Scope added |
| --- | --- | --- |
| Gmail | `add_label` | `https://www.googleapis.com/auth/gmail.modify` |
| Spotify | `save_to_library` | `user-library-modify` |
| Twitch | `send_chat_message` | `user:write:chat` |
| Twitch | `update_channel_info` | `channel:manage:broadcast` |
| Google Drive | `upload_file` | `https://www.googleapis.com/auth/drive.file` |
| Google Drive | `create_folder` | same `drive.file` grant |
| Notion | `create_database_item` | same Notion grant as the triggers |
| Notion | `update_page_property` | same Notion grant as the triggers |
| Slack | `send_message` | `chat:write` |
| Slack | `set_channel_topic` | `channels:manage` |
| Google Calendar | `create_event` | `https://www.googleapis.com/auth/calendar.events` |
| Google Calendar | `update_event` | same `calendar.events` grant |

Gmail, Spotify, and Twitch already have MVP triggers, so their extra actions can land as soon as the MVP workflow runs. Drive, Notion, Slack, and Calendar stay with their triggers on the Final milestone.

Timer stays trigger-only. `send_email` and `add_tracks_to_playlist` stay in ADR 0008 and are not repeated here.

## Alternatives rejected

- **Implementing all fourteen actions before 1 December.** The hand-in needs one workflow with two actions. Drive, Notion, Slack, and Calendar are already Final on the trigger side.
- **Dropping the second action on Gmail, Spotify, and Twitch.** The trigger catalogue is two per service. Leaving those services with a single action makes the final count depend entirely on the four Final services.
- **GitHub and Discord**, as in `docs/organization/PLAN.md`. Those services are not in the merged trigger set.

## Consequences

- The four-action defense workflow is assembled from ADR 0008 and this list. The data model already allows more than four action nodes.
- Gmail `add_label` needs `gmail.modify`, which can read and change mail. That is a wider grant than `gmail.send`. It stays off the MVP connection.
- Twitch chat and channel updates use a user access token. They do not use the app token that EventSub uses for the triggers, and chat only works in a channel where the connected user may speak.
- Spotify `save_to_library` accepts at most 50 track ids per call. Drive uploads fetch a URL only after the SSRF checks.
- One new sub-issue per service, under the action research issue, with the text from `docs/software/actions/`. The MVP issue stays the two actions in ADR 0008.
