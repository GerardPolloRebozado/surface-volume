# Google Calendar

Auth: `oauth2` (Google), scope `https://www.googleapis.com/auth/calendar.events`.

The triggers stay on `calendar.readonly`. `calendar.events` can create and update events and cannot change calendar settings.

## Create an event — `create_event`

Creates one event on a calendar.

- **Inputs**
  - `calendar_id` (select, required, `dynamicChoices`, default `primary`)
  - `title` (string, required)
  - `start` (datetime, required)
  - `end` (datetime, required)
  - `description` (text, optional)
- **Outputs:** `event_id`, `html_link`
- **How:** `events.insert` on `calendar_id`.
- **Example:** Slack `new_channel_message` containing "urgent" → create a 30-minute event starting now, with the message text as the description.

## Update an event — `update_event`

Changes the title, the start, or the end of an existing event.

- **Inputs**
  - `calendar_id` (select, required, `dynamicChoices`, default `primary`)
  - `event_id` (string, required): usually mapped from a Calendar trigger
  - `title` (string, optional)
  - `start` (datetime, optional)
  - `end` (datetime, optional)
- **Outputs:** `event_id`, `html_link`
- **How:** `events.patch` with only the fields that are set. An empty field is left unchanged.
- **Example:** `event_starting_soon` → prefix the title with "[soon]".
