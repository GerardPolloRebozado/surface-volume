# Spotify

Auth: `oauth2` (Spotify), scopes `user-follow-read`, `user-library-read` (+ `playlist-modify-public`, `playlist-modify-private` for the playlist action).

Both triggers fire on things that happen **without the user doing anything**.

> **Note:** apps in Spotify development mode only work for a small allowlist of users added by hand in the developer dashboard. That's fine for the project and the demo. Check the current developer terms when creating the app, because they have changed several times.

## New release by artist — `new_artist_release`

Fires when one of the chosen artists releases a new album or single.

- **Type:** polling (every 6 h; releases don't need minute-level latency and this keeps us far from rate limits)
- **Inputs**
  - `artist_ids` (select, `list: true`, required, `dynamicChoices` = artists the user follows, from `GET /me/following?type=artist`)
  - `release_type` (select, default `both`): albums / singles / both
- **Outputs:** `artist_id`, `artist_name`, `album_id`, `album_name`, `album_type`, `release_date`, `track_uris` (list), `spotify_url`, `cover_url`
- **How:** for each artist, `GET /artists/{id}/albums?include_groups=album,single`, diff against the album IDs stored in `ctx.store`. First run = baseline (see conventions), so it does not fire for the existing discography.
- **Example (main use case):** new release from the artist → **Spotify action "Add tracks to playlist"** with `track_uris` → my "New music" playlist.

## New podcast episode — `new_podcast_episode`

Fires when a show the user picked publishes a new episode.

- **Type:** polling (every 3 h)
- **Inputs**
  - `show_id` (select, required, `dynamicChoices` = the user's saved shows, from `GET /me/shows`)
- **Outputs:** `episode_id`, `episode_name`, `show_name`, `description`, `release_date`, `duration_ms`, `spotify_url`
- **How:** `GET /shows/{id}/episodes`, diff against stored episode IDs.
- **Example:** new episode → send a Slack message with the link.
