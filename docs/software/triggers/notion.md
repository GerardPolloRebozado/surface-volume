# Notion

Auth: `oauth2` (Notion public integration). The user picks which pages/databases to share with us during OAuth.

## New item in database — `new_database_item`

Fires when a page (row) is added to a database.

- **Type:** polling (every 120 s)
- **Inputs**
  - `database_id` (select, required, `dynamicChoices` = databases shared with the integration)
- **Outputs:** `page_id`, `url`, `title`, `created_time`, `created_by`, `properties` (json)
- **How:** query the database with a `created_time` filter after the last check, sorted ascending. Since Notion API version `2025-09-03`, databases contain *data sources*, so the query goes through the data source endpoint.
- **Example:** new row in "Bug reports" → post it to Slack.

## Database item property changed — `database_item_property_changed`

Fires when a property of a row changes to a given value, e.g. "Status becomes Done".

- **Type:** polling (every 120 s)
- **Inputs**
  - `database_id` (select, required, `dynamicChoices`, `altersDynamicFields`)
  - `property` (select, required, `dynamicChoices` = the database's properties)
  - `value` (string, optional): if empty, fire on any change of that property
- **Outputs:** `page_id`, `url`, `title`, `property`, `old_value`, `new_value`, `last_edited_time`
- **How:** query pages with `last_edited_time` after the last check. Keep each page's previous property value in `ctx.store` and fire only when the value actually changes (and matches `value` if set). Notion also offers webhooks (`page.properties_updated`) if we want to move to push later.
- **Example:** task moves to "Done" → send a Gmail email to the requester.
