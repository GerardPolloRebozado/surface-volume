# Gmail

Auth: `oauth2` (Google), scope `https://www.googleapis.com/auth/gmail.readonly`.

## New email matching search — `new_email_matching_search`

Fires when a new email arrives that matches a Gmail search query. One text field covers most use cases (sender, subject, label, attachments…).

- **Type:** polling (every 60 s)
- **Inputs**
  - `query` (string, required): Gmail search syntax, e.g. `from:boss@company.com has:attachment`
- **Outputs:** `message_id`, `thread_id`, `from`, `to`, `subject`, `snippet`, `body_text`, `received_at`, `has_attachments`, `labels`
- **How:** `users.messages.list` with `q = <query> after:<last check>`, then `users.messages.get` for each new ID. Store the seen IDs.
- **Example:** invoice email from the accountant → save the attachment to Google Drive.

## New starred email — `new_starred_email`

Fires when the user stars an email. It's a deliberate "send this to a workflow" gesture.

- **Type:** polling (every 60 s)
- **Inputs:** none
- **Outputs:** same as above
- **How:** `users.messages.list` with `q = is:starred`, diff against the stored set of starred IDs.
- **Example:** star an email → create a task in a Notion database.