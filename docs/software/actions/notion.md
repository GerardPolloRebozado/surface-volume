# Notion

Auth: `oauth2` (Notion public integration). The user picks which pages and databases to share with us during OAuth. Same grant as the triggers.

Since Notion API version `2025-09-03`, a database contains data sources. Creating or updating a row goes through the database's data source, as the triggers already do for queries.

## Create a database item — `create_database_item`

Adds one page (row) to a database.

- **Inputs**
  - `database_id` (select, required, `dynamicChoices` = databases shared with the integration)
  - `title` (string, required)
  - `properties` (json, optional): extra properties, keyed by property name
- **Outputs:** `page_id`, `url`
- **How:** resolve the database's data source, then create a page with that parent, the title, and `properties`.
- **Example:** Gmail `new_starred_email` → create a row in "Inbox" with the subject as the title and `message_id` in the properties.

## Update a page property — `update_page_property`

Sets one property on an existing page.

- **Inputs**
  - `page_id` (string, required): usually mapped from a Notion trigger
  - `property` (string, required): property name
  - `value` (string, required)
- **Outputs:** `page_id`, `url`
- **How:** patch the page properties for that data source. The property type decides the JSON shape (title, rich text, number, select, url).
- **Example:** `database_item_property_changed` when Status becomes "Done" → set "Closed at" to the run time.
