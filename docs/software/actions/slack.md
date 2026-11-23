# Slack

Auth: `oauth2` (Slack app). The triggers use `channels:history`, `channels:read`, and `reactions:read`. These actions add `chat:write` and `channels:manage`.

## Send a message — `send_message`

Posts one message in a channel, as the app.

- **Scope:** `chat:write`
- **Inputs**
  - `channel_id` (select, required, `dynamicChoices` = public channels)
  - `text` (text, required)
- **Outputs:** `message_ts`, `channel_id`, `permalink`
- **How:** `chat.postMessage`. `permalink` comes from `chat.getPermalink` with the returned `ts`.
- **Example:** Spotify `new_podcast_episode` → post the episode name and `spotify_url` in #music.

## Set the channel topic — `set_channel_topic`

Sets the topic of a public channel.

- **Scope:** `channels:manage`
- **Inputs**
  - `channel_id` (select, required, `dynamicChoices` = public channels)
  - `topic` (string, required, max 250 characters)
- **Outputs:** `channel_id`, `topic`
- **How:** `conversations.setTopic`.
- **Example:** Twitch `stream_online` → set the topic of #live to the stream title and `stream_url`.
