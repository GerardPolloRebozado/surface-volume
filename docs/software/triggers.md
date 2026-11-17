# Triggers

This document lists every trigger we plan to implement, per service: what it does, how it is detected, what the user configures, and what data it passes on to the next steps of a workflow.

It follows the interfaces in [`packages/backend-nestjs/src/workflow`](../../packages/backend-nestjs/src/workflow):
each trigger becomes a `TriggerDefinition` inside an `AppDefinition`, with `inputFields` (what the user configures) and `outputFields` (what later actions can reference).

## Overview

| Service | Trigger | Key | Type |
|---|---|---|---|
| Gmail | New email matching search | `new_email_matching_search` | polling |
| Gmail | New starred email | `new_starred_email` | polling |
| Google Drive | New file in folder | `new_file_in_folder` | polling |
| Google Drive | File updated | `file_updated` | polling |
| Notion | New item in database | `new_database_item` | polling |
| Notion | Database item property changed | `database_item_property_changed` | polling |
| Slack | New message in channel | `new_channel_message` | webhook |
| Slack | Reaction added | `reaction_added` | webhook |
| Google Calendar | Event starting soon | `event_starting_soon` | polling |
| Google Calendar | New event created | `new_event` | polling |
| Spotify | New release by artist | `new_artist_release` | polling |
| Spotify | New podcast episode | `new_podcast_episode` | polling |
| Twitch | Stream goes live | `stream_online` | webhook |
| Twitch | New follower | `new_follower` | webhook |
| Timer | Every day at | `every_day_at` | schedule |
| Timer | Every X minutes | `every_interval` | schedule |

## Conventions

- **Trigger types**
  - `webhook`: the service pushes events to us. Lower latency, but needs a public HTTPS URL, and usually signature verification (`verify`) and sometimes a challenge (`handshake`).
  - `polling`: we call the service every `defaultIntervalSec` and compare with what we saw last time.
  - `schedule`: fired by our own scheduler, no external service.
- **Deduplication:** polling triggers keep their state in `ctx.store` (last-seen IDs, timestamps, sync tokens) so an item never fires twice.
- **First run = baseline:** the first poll after a workflow is enabled only records the current state and does **not** fire. Otherwise "new release by artist" would fire for the artist's whole discography.
- **`TriggerEvent.id`** is the ID of the underlying item (message ID, file ID, match ID…), so duplicates can also be dropped further down the pipeline.
- Google services support push notifications (Gmail via Pub/Sub, Drive/Calendar via `watch` channels), but those channels expire and must be renewed. We start with polling; switching to push later only changes the trigger's internals.

---

## Gmail

Auth: `oauth2` (Google), scope `https://www.googleapis.com/auth/gmail.readonly`.

### New email matching search — `new_email_matching_search`

Fires when a new email arrives that matches a Gmail search query. One text field covers most use cases (sender, subject, label, attachments…).

- **Type:** polling (every 60 s)
- **Inputs**
  - `query` (string, required): Gmail search syntax, e.g. `from:boss@company.com has:attachment`
- **Outputs:** `message_id`, `thread_id`, `from`, `to`, `subject`, `snippet`, `body_text`, `received_at`, `has_attachments`, `labels`
- **How:** `users.messages.list` with `q = <query> after:<last check>`, then `users.messages.get` for each new ID. Store the seen IDs.
- **Example:** invoice email from the accountant → save the attachment to Google Drive.

### New starred email — `new_starred_email`

Fires when the user stars an email. It's a deliberate "send this to a workflow" gesture.

- **Type:** polling (every 60 s)
- **Inputs:** none
- **Outputs:** same as above
- **How:** `users.messages.list` with `q = is:starred`, diff against the stored set of starred IDs.
- **Example:** star an email → create a task in a Notion database.

---

## Google Drive

Auth: `oauth2` (Google), scope `https://www.googleapis.com/auth/drive.readonly`.

### New file in folder — `new_file_in_folder`

Fires when a file is created in (or moved into) a chosen folder.

- **Type:** polling (every 120 s)
- **Inputs**
  - `folder_id` (select, required, `dynamicChoices` = the user's folders)
  - `mime_type` (select, optional): any / document / spreadsheet / PDF / image
- **Outputs:** `file_id`, `name`, `mime_type`, `web_view_link`, `created_time`, `owner_email`, `size`
- **How:** `files.list` with `q = '<folder_id>' in parents and createdTime > '<last check>' and trashed = false`.
- **Example:** new file in "Invoices" → post the link in a Slack channel.

### File updated — `file_updated`

Fires when a chosen file, or any file inside a chosen folder, is modified.

- **Type:** polling (every 120 s)
- **Inputs**
  - `folder_id` (select, required, `dynamicChoices`)
  - `file_id` (select, optional, `dynamicChoices` = files in the folder): if empty, watch the whole folder
- **Outputs:** `file_id`, `name`, `web_view_link`, `modified_time`, `last_modifying_user`
- **How:** Drive `changes.list` with a `pageToken` saved in `ctx.store` (initial token from `changes.getStartPageToken`), filtered to the selected folder or file.
- **Example:** the team planning sheet is edited → send a Slack message.

---

## Notion

Auth: `oauth2` (Notion public integration). The user picks which pages/databases to share with us during OAuth.

### New item in database — `new_database_item`

Fires when a page (row) is added to a database.

- **Type:** polling (every 120 s)
- **Inputs**
  - `database_id` (select, required, `dynamicChoices` = databases shared with the integration)
- **Outputs:** `page_id`, `url`, `title`, `created_time`, `created_by`, `properties` (json)
- **How:** query the database with a `created_time` filter after the last check, sorted ascending. Since Notion API version `2025-09-03`, databases contain *data sources*, so the query goes through the data source endpoint.
- **Example:** new row in "Bug reports" → post it to Slack.

### Database item property changed — `database_item_property_changed`

Fires when a property of a row changes to a given value, e.g. "Status becomes Done".

- **Type:** polling (every 120 s)
- **Inputs**
  - `database_id` (select, required, `dynamicChoices`, `altersDynamicFields`)
  - `property` (select, required, `dynamicChoices` = the database's properties)
  - `value` (string, optional): if empty, fire on any change of that property
- **Outputs:** `page_id`, `url`, `title`, `property`, `old_value`, `new_value`, `last_edited_time`
- **How:** query pages with `last_edited_time` after the last check. Keep each page's previous property value in `ctx.store` and fire only when the value actually changes (and matches `value` if set). Notion also offers webhooks (`page.properties_updated`) if we want to move to push later.
- **Example:** task moves to "Done" → send a Gmail email to the requester.

---

## Slack

Auth: `oauth2` (Slack app). Bot scopes: `channels:history`, `channels:read`, `reactions:read`.

> **Implementation note:** Slack's Events API is configured with **one request URL per Slack app**, not one per workflow. We need a single shared endpoint that receives every Slack event and dispatches it to the matching workflows (by `team_id` + channel), instead of calling `subscribe` with a per-workflow `webhookUrl`.
> The `verify` hook checks the `X-Slack-Signature` HMAC with the signing secret, and the `handshake` hook answers Slack's `url_verification` challenge.

### New message in channel — `new_channel_message`

Fires when a message is posted in a chosen channel.

- **Type:** webhook (`message.channels` event)
- **Inputs**
  - `channel_id` (select, required, `dynamicChoices` = public channels)
  - `contains` (string, optional): only fire if the text contains this keyword
  - `ignore_bots` (boolean, default `true`): avoids loops when our own action posts to the same channel
- **Outputs:** `message_ts`, `channel_id`, `user_id`, `user_name`, `text`, `permalink`, `thread_ts`
- **Example:** message containing "urgent" in #support → create a Google Calendar event.

### Reaction added — `reaction_added`

Fires when someone adds a specific emoji to a message.

- **Type:** webhook (`reaction_added` event)
- **Inputs**
  - `channel_id` (select, optional, `dynamicChoices`): if empty, any channel
  - `emoji` (string, required): name without colons, e.g. `ticket`
- **Outputs:** `emoji`, `reacting_user_id`, `message_ts`, `message_text`, `message_author_id`, `channel_id`, `permalink`
- **How:** the event only contains the message reference, so fetch the message text with `conversations.history` (`latest = ts`, `inclusive`, `limit = 1`).
- **Example:** react with 🎫 → create a row in the Notion "Tickets" database.

---

## Google Calendar

Auth: `oauth2` (Google), scope `https://www.googleapis.com/auth/calendar.readonly`.

### Event starting soon — `event_starting_soon`

Fires X minutes before an event starts.

- **Type:** polling (every 60 s)
- **Inputs**
  - `calendar_id` (select, required, `dynamicChoices`, default `primary`)
  - `minutes_before` (number, required, default `15`)
  - `search` (string, optional): only events whose title contains this text
- **Outputs:** `event_id`, `title`, `description`, `start`, `end`, `location`, `meet_link`, `attendees`, `html_link`
- **How:** `events.list` with `timeMin = now + minutes_before` and `timeMax = timeMin + poll interval`, `singleEvents = true`. Store the fired event IDs (recurring events have one ID per occurrence).
- **Example:** 10 minutes before a meeting → send the Meet link in Slack.

### New event created — `new_event`

Fires when an event is added to a calendar, including invitations from other people.

- **Type:** polling (every 120 s)
- **Inputs**
  - `calendar_id` (select, required, `dynamicChoices`, default `primary`)
- **Outputs:** same as above + `organizer_email`, `created`
- **How:** incremental sync with `events.list` + `syncToken` saved in `ctx.store`. Fire only for items whose `created` is after the last check (the sync also returns updates and deletions).
- **Example:** new event → create a matching prep page in Notion.

---

## Spotify

Auth: `oauth2` (Spotify), scopes `user-follow-read`, `user-library-read` (+ `playlist-modify-public`, `playlist-modify-private` for the playlist action).

Both triggers fire on things that happen **without the user doing anything**.

> **Note:** apps in Spotify development mode only work for a small allowlist of users added by hand in the developer dashboard. That's fine for the project and the demo. Check the current developer terms when creating the app, because they have changed several times.

### New release by artist — `new_artist_release`

Fires when one of the chosen artists releases a new album or single.

- **Type:** polling (every 6 h; releases don't need minute-level latency and this keeps us far from rate limits)
- **Inputs**
  - `artist_ids` (select, `list: true`, required, `dynamicChoices` = artists the user follows, from `GET /me/following?type=artist`)
  - `release_type` (select, default `both`): albums / singles / both
- **Outputs:** `artist_id`, `artist_name`, `album_id`, `album_name`, `album_type`, `release_date`, `track_uris` (list), `spotify_url`, `cover_url`
- **How:** for each artist, `GET /artists/{id}/albums?include_groups=album,single`, diff against the album IDs stored in `ctx.store`. First run = baseline (see conventions), so it does not fire for the existing discography.
- **Example (main use case):** new release from the artist → **Spotify action "Add tracks to playlist"** with `track_uris` → my "New music" playlist.

### New podcast episode — `new_podcast_episode`

Fires when a show the user picked publishes a new episode.

- **Type:** polling (every 3 h)
- **Inputs**
  - `show_id` (select, required, `dynamicChoices` = the user's saved shows, from `GET /me/shows`)
- **Outputs:** `episode_id`, `episode_name`, `show_name`, `description`, `release_date`, `duration_ms`, `spotify_url`
- **How:** `GET /shows/{id}/episodes`, diff against stored episode IDs.
- **Example:** new episode → send a Slack message with the link.

---

## Twitch

Auth: `oauth2` (Twitch). EventSub webhooks use an **app** access token. The `verify` hook checks the `Twitch-Eventsub-Message-Signature` HMAC, and the `handshake` hook answers the `webhook_callback_verification` challenge. The callback must be HTTPS on port 443.

### Stream goes live — `stream_online`

Fires when a chosen streamer starts streaming.

- **Type:** webhook (EventSub `stream.online`)
- **Inputs**
  - `broadcaster_login` (string, required): channel name, e.g. `tenz`
- **Outputs:** `broadcaster_id`, `broadcaster_name`, `title`, `game_name`, `started_at`, `stream_url`
- **How:** `subscribe` resolves the login to a user ID (`GET /helix/users`) and creates the EventSub subscription with our `webhookUrl`. `unsubscribe` deletes it. The event does not contain the title or game, so `parse` fetches them from `GET /helix/streams`.
- **Example:** favourite streamer goes live → Slack message with the link.

### New follower — `new_follower`

Fires when someone follows the user's own Twitch channel.

- **Type:** webhook (EventSub `channel.follow` v2, needs scope `moderator:read:followers` on the user's channel)
- **Inputs:** none (uses the connected account's channel)
- **Outputs:** `follower_id`, `follower_name`, `followed_at`
- **Example:** new follower → add a row to a Notion "Community" database.

---

## Timer

Built-in service, no auth. Uses the `schedule` trigger type, so our own scheduler fires it.

### Every day at — `every_day_at`

- **Type:** schedule
- **Inputs**
  - `time` (string, required): `HH:mm`
  - `days` (select, `list: true`, default all days): Mon … Sun
  - `timezone` (select, required, default the user's timezone)
- **Outputs:** `fired_at`, `day_of_week`
- **Example:** every weekday at 9:00 → Slack message with today's Google Calendar events.

### Every X minutes — `every_interval`

- **Type:** schedule
- **Inputs**
  - `interval_minutes` (number, required, minimum `5`)
- **Outputs:** `fired_at`
- **Example:** every 30 minutes → check something and notify.
