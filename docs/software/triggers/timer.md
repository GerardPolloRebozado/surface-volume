# Timer

Built-in service, no auth. Uses the `schedule` trigger type, so our own scheduler fires it.

## Every day at — `every_day_at`

- **Type:** schedule
- **Inputs**
  - `time` (string, required): `HH:mm`
  - `days` (select, `list: true`, default all days): Mon … Sun
  - `timezone` (select, required, default the user's timezone)
- **Outputs:** `fired_at`, `day_of_week`
- **Example:** every weekday at 9:00 → Slack message with today's Google Calendar events.

## Every X minutes — `every_interval`

- **Type:** schedule
- **Inputs**
  - `interval_minutes` (number, required, minimum `5`)
- **Outputs:** `fired_at`
- **Example:** every 30 minutes → check something and notify.
