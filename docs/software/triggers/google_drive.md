# Google Drive

Auth: `oauth2` (Google), scope `https://www.googleapis.com/auth/drive.readonly`.

## New file in folder — `new_file_in_folder`

Fires when a file is created in (or moved into) a chosen folder.

- **Type:** polling (every 120 s)
- **Inputs**
  - `folder_id` (select, required, `dynamicChoices` = the user's folders)
  - `mime_type` (select, optional): any / document / spreadsheet / PDF / image
- **Outputs:** `file_id`, `name`, `mime_type`, `web_view_link`, `created_time`, `owner_email`, `size`
- **How:** `files.list` with `q = '<folder_id>' in parents and createdTime > '<last check>' and trashed = false`.
- **Example:** new file in "Invoices" → post the link in a Slack channel.

## File updated — `file_updated`

Fires when a chosen file, or any file inside a chosen folder, is modified.

- **Type:** polling (every 120 s)
- **Inputs**
  - `folder_id` (select, required, `dynamicChoices`)
  - `file_id` (select, optional, `dynamicChoices` = files in the folder): if empty, watch the whole folder
- **Outputs:** `file_id`, `name`, `web_view_link`, `modified_time`, `last_modifying_user`
- **How:** Drive `changes.list` with a `pageToken` saved in `ctx.store` (initial token from `changes.getStartPageToken`), filtered to the selected folder or file.
- **Example:** the team planning sheet is edited → send a Slack message.