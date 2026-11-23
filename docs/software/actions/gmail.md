# Gmail

Auth: `oauth2` (Google).

The triggers use `https://www.googleapis.com/auth/gmail.readonly` and never send or modify mail. These actions ask for their own scopes. A workflow that only sends mail does not need the readonly grant.

## Send an email — `send_email`

Sends one email from the connected account.

- **Scope:** `https://www.googleapis.com/auth/gmail.send`
- **Inputs**
  - `to` (string, required)
  - `subject` (string, required)
  - `body` (text, required)
- **Outputs:** `message_id`, `thread_id`
- **How:** `users.messages.send` with one RFC 2822 message (`To`, `Subject`, `text/plain; charset=utf-8`), base64url-encoded in `raw`. The From address is the connected account.
- **Example:** Spotify `new_artist_release` → send the album name and `spotify_url` to the user. This is one of the two actions in the 1 December workflow.

`gmail.send` is a restricted scope. The Google Cloud app stays in testing, and every account that sends mail has to be a test user.

## Add a label — `add_label`

Adds one label to an existing message. It does not send mail.

- **Scope:** `https://www.googleapis.com/auth/gmail.modify`
- **Inputs**
  - `message_id` (string, required): a Gmail message id, usually mapped from a Gmail trigger
  - `label` (string, required): label name, e.g. `Processed`
- **Outputs:** `message_id`, `label_id`
- **How:** `users.labels.list`, then `users.labels.create` when the name does not exist yet. `users.messages.modify` with `addLabelIds`.
- **Example:** `new_email_matching_search` for invoices → label the message `Invoices`.
