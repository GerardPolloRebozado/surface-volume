# contract

The API surface, written once: `types.ts` (derived from the backend's
`workflow.types.ts`) and `fixtures/*.json` (what the API returns today).

Both clients read the same JSON:

- **web** — imports the fixtures directly and types them with `types.ts`.
- **Kotlin** — `:core` generates `Fixtures.kt` from these files at build time and
  decodes them with `@Serializable` DTOs, with `ignoreUnknownKeys = false`.

That last part is the point: if a fixture gains a field the Kotlin DTO does not
know, `:core:jvmTest` fails. If the backend type changes, `tsc` fails. The mock
cannot silently drift from the real format.

```
types.ts                 API shapes, graph imported from the backend
fixtures/
  workflows.json         WorkflowListItem[] — the list screen
  runs.json              WorkflowRun[]      — the activity feed
  connections.json       ConnectionResource[]
  catalogue.json         AppCatalogueEntry[] — display names for app/trigger/action keys
  account.json           Account
  stats.json             DashboardStats
```

These are demo values, not seed data for the database. When the endpoints exist,
the same shapes come from HTTP and the fixtures are deleted.
