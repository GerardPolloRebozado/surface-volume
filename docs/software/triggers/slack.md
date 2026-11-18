# Slack

Auth: `oauth2` (Slack app). Bot scopes: `channels:history`, `channels:read`, `reactions:read`.

> **Implementation note:** Slack's Events API is configured with **one request URL per Slack app**, not one per workflow. We need a single shared endpoint that receives every Slack event and dispatches it to the matching workflows (by `team_id` + channel), instead of calling `subscribe` with a per-workflow `webhookUrl`.
> The `verify` hook checks the `X-Slack-Signature` HMAC with the signing secret, and the `handshake` hook answers Slack's `url_verification` challenge.

## New message in channel — `new_channel_message`

Fires when a message is posted in a chosen channel.

- **Type:** webhook (`message.channels` event)
- **Inputs**
  - `channel_id` (select, required, `dynamicChoices` = public channels)
  - `contains` (string, optional): only fire if the text contains this keyword
  - `ignore_bots` (boolean, default `true`): avoids loops when our own action posts to the same channel
- **Outputs:** `message_ts`, `channel_id`, `user_id`, `user_name`, `text`, `permalink`, `thread_ts`
- **Example:** message containing "urgent" in #support → create a Google Calendar event.

## Reaction added — `reaction_added`

Fires when someone adds a specific emoji to a message.

- **Type:** webhook (`reaction_added` event)
- **Inputs**
  - `channel_id` (select, optional, `dynamicChoices`): if empty, any channel
  - `emoji` (string, required): name without colons, e.g. `ticket`
- **Outputs:** `emoji`, `reacting_user_id`, `message_ts`, `message_text`, `message_author_id`, `channel_id`, `permalink`
- **How:** the event only contains the message reference, so fetch the message text with `conversations.history` (`latest = ts`, `inclusive`, `limit = 1`).
- **Example:** react with 🎫 → create a row in the Notion "Tickets" database.
