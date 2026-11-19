# ADR 0007 - Triggers decision

* Status: **Proposed**
* Date: 2026-11-19
* Deciders: @pallaresrod

## Context

Surface Volume runs workflows that start when a **trigger** fires. The trigger contract is already defined in `packages/backend-nestjs/src/workflow/triggers.types.ts` and allows three kinds of triggers:

* `webhook` - the service pushes events to us.
* `polling` - we query the service on an interval and diff against what we saw before.
* `schedule` - fired by our own scheduler.

We needed to decide:
**which services and triggers** to implement first, **how each one detects events** (webhook or polling).

## Decision

Implement the **16 triggers** specified in [`docs/software/triggers.md`](../software/triggers.md): two per service.

| Service | Triggers | Detection |
|---|---|---|
| Gmail | New email matching search, New starred email | polling |
| Google Drive | New file in folder, File updated | polling |
| Notion | New item in database, Database item property changed | polling |
| Slack | New message in channel, Reaction added | webhook (Events API) |
| Google Calendar | Event starting soon, New event created | polling |
| Spotify | New release by artist, New podcast episode | polling |
| Twitch | Stream goes live, New follower | webhook (EventSub) |
| Timer | Every day at, Every X minutes | schedule |

Cross-cutting rules for every trigger:

* **Polling first for Google services and Notion.** Their push mechanisms (Gmail Pub/Sub, Drive/Calendar `watch` channels, Notion webhooks) expire and must be renewed, or need extra infrastructure. Polling works everywhere. We can switch a trigger to push later without changing its definition.
* **Webhooks where the service only offers push, or offers it cheaply** (Slack, Twitch). They use the `verify` hook (HMAC signature) and the `handshake` hook.
* **The first poll only records a baseline and never fires.** Otherwise a newly enabled "new release by artist" would fire for the artist's whole discography.
* **Spotify triggers do not depend on user activity**: they watch artists and shows, so the workflow runs on its own (e.g. new release → add it to a playlist).

### Alternatives rejected

* **Tinder** - no public API. The only way in is the reverse-engineered private API, which breaks their terms of service, can get the account banned, and changes without warning.
* **Riot official match API for Valorant** - needs a production key that requires approval from Riot, with no guarantee.
* **Push notifications for Google services from day one** - more moving parts (public HTTPS endpoint, Pub/Sub, channel renewal) for a latency gain the demo doesn't need.

## Consequences

### Positive

* **Every base service has two triggers**, plus two added services and a built-in Timer, so the demo has many combinations.
* **Polling is simple and uniform**: one scheduler, no public endpoint needed in local development, easy to test with the `test` hook.
* **The spec in `triggers.md` maps one-to-one onto `TriggerDefinition`** (inputs, outputs, type), so implementation can be split per service.
* **Baseline + dedup rules** prevent duplicate or flood firing across all polling triggers.

### Negative

1. **Polling adds latency and API usage.** Triggers fire up to one interval late (1 min to 12 h depending on the trigger), and each active workflow costs API calls even when nothing happens. We have to watch rate limits, especially for Gmail and Spotify.
2. **Slack needs a shared endpoint.** Slack Events API has one request URL per app, not per workflow, so we need a dispatcher that routes events to workflows by `team_id` / channel. This does not fit the per-workflow `IncomingWebhook.workflowId` model as is.
4. **Spotify development mode** limits the app to a hand-maintained allowlist of users, which is enough for the project but not for public use.
5. **Twitch EventSub** requires a public HTTPS callback on port 443, so webhook triggers can't be tested locally without a tunnel.
