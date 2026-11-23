# Google Drive

Auth: `oauth2` (Google), scope `https://www.googleapis.com/auth/drive.file`.

The triggers stay on `drive.readonly`. `drive.file` can create files and can only see files this app created.

## Upload a file — `upload_file`

Stores one file in a chosen folder.

- **Inputs**
  - `name` (string, required)
  - `folder_id` (select, required, `dynamicChoices` = the user's folders)
  - `file_url` (string, required): a URL published by an earlier step, such as an attachment link
- **Outputs:** `file_id`, `name`, `web_view_link`
- **How:** fetch `file_url` only after the SSRF checks, then `files.create` (multipart) with that parent folder.
- **Example:** Gmail `new_email_matching_search` for an invoice → upload the attachment into "Invoices".

## Create a folder — `create_folder`

Creates one folder.

- **Inputs**
  - `name` (string, required)
  - `parent_folder_id` (select, optional, `dynamicChoices`): empty means My Drive
- **Outputs:** `folder_id`, `name`, `web_view_link`
- **How:** `files.create` with `mimeType` `application/vnd.google-apps.folder`.
- **Example:** a new client name arrives → create a folder with that name, then upload the file into it.
