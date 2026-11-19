# Twitch

Auth: `oauth2` (Twitch). EventSub webhooks use an **app** access token. The `verify` hook checks the `Twitch-Eventsub-Message-Signature` HMAC, and the `handshake` hook answers the `webhook_callback_verification` challenge. The callback must be HTTPS on port 443.

## Stream goes live — `stream_online`

Fires when a chosen streamer starts streaming.

- **Type:** webhook (EventSub `stream.online`)
- **Inputs**
  - `broadcaster_login` (string, required): channel name, e.g. `tenz`
- **Outputs:** `broadcaster_id`, `broadcaster_name`, `title`, `game_name`, `started_at`, `stream_url`
- **How:** `subscribe` resolves the login to a user ID (`GET /helix/users`) and creates the EventSub subscription with our `webhookUrl`. `unsubscribe` deletes it. The event does not contain the title or game, so `parse` fetches them from `GET /helix/streams`.
- **Example:** favourite streamer goes live → Slack message with the link.

## New follower — `new_follower`

Fires when someone follows the user's own Twitch channel.

- **Type:** webhook (EventSub `channel.follow` v2, needs scope `moderator:read:followers` on the user's channel)
- **Inputs:** none (uses the connected account's channel)
- **Outputs:** `follower_id`, `follower_name`, `followed_at`
- **Example:** new follower → add a row to a Notion "Community" database.