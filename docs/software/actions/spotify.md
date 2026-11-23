# Spotify

Auth: `oauth2` (Spotify). The triggers already use `user-follow-read` and `user-library-read`. These actions add the write scopes below, on the same app.

Apps in Spotify development mode only work for a small allowlist of users added by hand in the developer dashboard. That is the same limit as the triggers.

## Add tracks to a playlist — `add_tracks_to_playlist`

Appends tracks to one of the user's playlists.

- **Scopes:** `playlist-modify-public`, `playlist-modify-private`
- **Inputs**
  - `playlist_id` (select, required, `dynamicChoices` = the user's playlists, from `GET /me/playlists`)
  - `track_uris` (string, `list: true`, required): Spotify track URIs, usually mapped from `new_artist_release`
- **Outputs:** `playlist_id`, `snapshot_id`
- **How:** `POST /playlists/{playlist_id}/tracks` with `{ uris }`. Spotify accepts at most 100 URIs per call, so a longer list is sent in batches of 100. The last `snapshot_id` is the output.
- **Example (main use case):** `new_artist_release` with `album_type` equal to `album` → add `track_uris` to the "New music" playlist. This is one of the two actions in the 1 December workflow.

## Save to library — `save_to_library`

Saves tracks to the user's "Liked songs".

- **Scope:** `user-library-modify`
- **Inputs**
  - `track_uris` (string, `list: true`, required)
- **Outputs:** `saved` (boolean)
- **How:** strip each `spotify:track:` URI to an id, then `PUT /me/tracks` with `{ ids }`. At most 50 ids per call.
- **Example:** `new_artist_release` → save the new tracks to the library.
