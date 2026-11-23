# Twitch

Auth: `oauth2` (Twitch), as the connected user. These writes use a user access token. They do not use the app token that EventSub uses for the triggers.

## Send a chat message — `send_chat_message`

Posts one message in a channel, as the connected user.

- **Scope:** `user:write:chat`
- **Inputs**
  - `broadcaster_id` (string, required): the channel to post in. Default is the connected user's own channel.
  - `message` (string, required, max 500 characters)
- **Outputs:** `message_id`, `is_sent`
- **How:** `POST /helix/chat/messages` with `broadcaster_id`, `sender_id` (the connected user), and `message`. The user must be allowed to speak in that channel.
- **Example:** `stream_online` for the user's own channel → post "We're live" in that chat.

## Update channel info — `update_channel_info`

Changes the title, the category, or both, on the connected user's channel.

- **Scope:** `channel:manage:broadcast`
- **Inputs**
  - `title` (string, optional)
  - `game_name` (string, optional): category name, e.g. `Just Chatting`
- **Outputs:** `title`, `game_name`
- **How:** resolve `game_name` with `GET /helix/games?name=`, then `PATCH /helix/channels?broadcaster_id=` with `title` and `game_id`. An empty field is left unchanged. `broadcaster_id` is the connected user.
- **Example:** `new_artist_release` → set the stream title to the album name.
