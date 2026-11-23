# Actions

This document lists every action we plan to implement, per service: what it does, what the user configures, and what data it passes on to the next steps of a workflow.

In the subject these are REActions. The tickets and this folder call them actions.

It follows the interfaces in [`packages/backend-nestjs/src/workflow`](../../../packages/backend-nestjs/src/workflow):
each action becomes an `ActionDefinition` inside an `AppDefinition`, with `inputFields` (what the user configures, including values mapped from earlier nodes) and `outputFields` (what later nodes can reference). `run(ctx)` performs the call and returns those outputs.

The workflow that has to run on 1 December uses two of these: Spotify `add_tracks_to_playlist` and Gmail `send_email`. That choice is [ADR 0008](../../adr/0008-mvp-actions.md). The other twelve are [ADR 0009](../../adr/0009-remaining-actions.md).

## Overview

| Service | Action | Key |
|---|---|---|
| Gmail | Send an email | `send_email` |
| Gmail | Add a label | `add_label` |
| Google Drive | Upload a file | `upload_file` |
| Google Drive | Create a folder | `create_folder` |
| Notion | Create a database item | `create_database_item` |
| Notion | Update a page property | `update_page_property` |
| Slack | Send a message | `send_message` |
| Slack | Set the channel topic | `set_channel_topic` |
| Google Calendar | Create an event | `create_event` |
| Google Calendar | Update an event | `update_event` |
| Spotify | Add tracks to a playlist | `add_tracks_to_playlist` |
| Spotify | Save to library | `save_to_library` |
| Twitch | Send a chat message | `send_chat_message` |
| Twitch | Update channel info | `update_channel_info` |

Timer has no action. It only starts a workflow.

## Conventions

- **One call, one result.** `run` does the write and returns the outputs. A failure throws `ActionError` with kind `retryable`, `fatal`, `auth_expired`, or `rate_limited`.
- **Inputs may be mapped.** A field can be a literal the user typed, or a reference to an output of the trigger or of an earlier action.
- **Scopes are per app.** The action scopes below are added to that service's OAuth app. A connection stores the granted scopes. The trigger and the action of the same service share one connection when the grant covers both.
- **Writes use the smallest scope that can do the job.** Gmail triggers stay on `gmail.readonly`. Sending mail does not read the mailbox, so `send_email` asks for `gmail.send` only.
