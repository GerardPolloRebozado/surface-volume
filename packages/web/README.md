# surface-web

The web app: **Astro SSR** with React islands. One package, one build.

## Why Astro

The public landing page is plain HTML with no JS. The app pages are rendered on
the server from the same fixtures the Kotlin client decodes, so the browser
receives HTML containing the data; React only hydrates the interactive parts
(filters, toggles, the node canvas).

```
src/
  layouts/      Base + App shell (sidebar, nav)
  pages/        .astro routes — data is read here, on the server
    index.astro           landing, zero JS
    workflows.astro       SSR + Workflows island
    runs.astro            SSR + Runs island
    services.astro        SSR + Services island
    settings.astro        SSR + Settings island
    android.astro         SSR + Android island
    signin.astro          SSR + Sign in island
    builder/[...id].astro client-only React Flow canvas
  routes/       React components used as islands
  components/   UI primitives, icons, charts
  data/         contract fixtures typed by packages/contract
  styles/       design tokens ported from docs/wireframes/theme.js
```

`@/`, `@contract` and `@backend` aliases live in `astro.config.mjs`.

## Data

Shapes come from `packages/contract/types.ts`, which imports the graph from the
backend's `workflow.types.ts`. Values come from `packages/contract/fixtures`,
the same files `:core` decodes with `ignoreUnknownKeys = false`. When the API
exists, the server-side imports in the `.astro` pages become `fetch` calls; the
islands keep their props.

## Scripts

| command | what it does |
| --- | --- |
| `pnpm dev:web` | Astro dev server on port 4321 |
| `pnpm build:web` | SSR build (Node adapter) |

To see the SSR difference:

```bash
pnpm dev:web
curl http://localhost:4321/workflows | grep "Bounty contracts"
```

The name is in the HTML before any JavaScript runs.

## Auth

The sign-in island calls Astro endpoints in `src/pages/api/auth`, which forward
to the NestJS backend at `POST /auth/sign-in` and copy the HttpOnly cookies back
to the browser. `/auth/me` and `/auth/sign-out` are proxied the same way, and
`src/middleware.ts` redirects to `/signin` when there is no access cookie.

Set the backend URL with `BACKEND_URL` (default `http://localhost:8080`).
