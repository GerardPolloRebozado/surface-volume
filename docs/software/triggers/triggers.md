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
