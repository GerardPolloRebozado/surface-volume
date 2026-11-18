# Google Calendar

Auth: `oauth2` (Google), scope `https://www.googleapis.com/auth/calendar.readonly`.

## Event starting soon — `event_starting_soon`

Fires X minutes before an event starts.

- **Type:** polling (every 60 s)
- **Inputs**
  - `calendar_id` (select, required, `dynamicChoices`, default `primary`)
  - `minutes_before` (number, required, default `15`)
  - `search` (string, optional): only events whose title contains this text
- **Outputs:** `event_id`, `title`, `description`, `start`, `end`, `location`, `meet_link`, `attendees`, `html_link`
- **How:** `events.list` with `timeMin = now + minutes_before` and `timeMax = timeMin + poll interval`, `singleEvents = true`. Store the fired event IDs (recurring events have one ID per occurrence).
- **Example:** 10 minutes before a meeting → send the Meet link in Slack.

## New event created — `new_event`

Fires when an event is added to a calendar, including invitations from other people.

- **Type:** polling (every 120 s)
- **Inputs**
  - `calendar_id` (select, required, `dynamicChoices`, default `primary`)
- **Outputs:** same as above + `organizer_email`, `created`
- **How:** incremental sync with `events.list` + `syncToken` saved in `ctx.store`. Fire only for items whose `created` is after the last check (the sync also returns updates and deletions).
- **Example:** new event → create a matching prep page in Notion.
