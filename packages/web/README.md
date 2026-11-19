# surface-web

The web UI: React 19 + Vite + TypeScript + Tailwind 4.

## Where the data comes from

The API contract is **not** defined here. It lives in `packages/contract`:

```
packages/contract/
  types.ts            API shapes; the graph is imported from the backend's
                      workflow.types.ts, so it cannot drift
  fixtures/*.json     what the API returns today
```

This app imports both. The fixtures are typed as `WorkflowListItem[]`,
`WorkflowRun[]`, … and the graph shapes come straight from the backend's
TypeScript. When the endpoints exist, `src/data/contract.ts` is the only file
that changes: the fixtures become `fetch` calls with the same types.

The Kotlin app decodes **the same JSON** with `@Serializable` DTOs
(`packages/frontend-kmp/core`), using `ignoreUnknownKeys = false`. That decode
runs in `:core:jvmTest`, so a fixture that gains a field one side does not know
fails the build instead of a screen.

Nothing is hand-written twice: `src/data/mock.ts` only projects the fixtures
into what a row paints (service names and colours, a relative timestamp).

## Scripts

| command | what it does |
| --- | --- |
| `pnpm dev:web` | Vite dev server |
| `pnpm build:web` | type-check + production bundle |
| `pnpm lint:web` | oxlint |
| `pnpm test:core` | decode the fixtures with the Kotlin DTOs |

## Layout

```
src/
  components/   shell, topbar, icons, service marks, charts
  data/
    contract.ts   the fixtures, typed by packages/contract
    mock.ts       fixtures projected for the screens
    types.ts      UI vocabulary (service state, row status)
  lib/          formatting and theme helpers
  routes/       Workflows, Builder, placeholders
  styles/       design tokens ported from docs/wireframes/theme.js
```

`@contract/*` and `@backend/*` are aliases declared in `tsconfig.app.json` and
`vite.config.ts`; they point outside this package on purpose.
