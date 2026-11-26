# Surface Volume — Monorepo

Automation platform: NestJS backend + Kotlin Multiplatform frontend, with a generated Kotlin API client from the NestJS OpenAPI spec.

```
surface-volume-monorepo/
├── packages/
│   ├── backend-nestjs/     # NestJS REST API (TypeScript)
│   ├── contract/           # API types + JSON fixtures, read by web and Kotlin
│   ├── web/                # Astro SSR web app (React islands + Tailwind)
│   ├── frontend-kmp/       # Kotlin Multiplatform (Android, desktop, iOS)
│   │   └── core/           # API DTOs and business rules shared by both UIs
│   └── api-client/         # Generated Kotlin client from OpenAPI spec
├── scripts/
│   └── generate-api-client.sh   # OpenAPI Generator → Kotlin client
├── docs/adr/               # Architecture Decision Records
├── decision/               # Stack recommendation
├── spikes/                 # Timeboxed technology spikes
└── .github/
    └── workflows/
        └── generate-api-client.yml   # CI: regenerate client on spec change
```

---

## Stack

| Layer | Choice | ADR |
|---|---|---|
| Backend | NestJS (TypeScript, Node.js) | `docs/adr/0001-nestjs-backend.md` |
| Frontend | React for web; Kotlin Multiplatform + Compose for Android/desktop/iOS | `docs/adr/0002-kotlin-multiplatform-frontend.md` |
| Database | PostgreSQL (JSONB for workflow configs) | `docs/adr/0003-postgresql-database.md` |
| Contingency | MongoDB — deferred with explicit triggers | `docs/adr/0004-mongodb-workflow-json-future.md` |
| Hosting | Azure, managed with Terraform | `docs/adr/0005-azure-terraform.md` |

**Stack decision:** `decision/RECOMMENDATION.md`

Full rationale: `docs/STACK-DECISION.md`

---

## Requirements to develop

### Backend (NestJS)

| Tool | Version | Install |
|---|---|---|
| Node.js | 20+ | https://nodejs.org/ |
| pnpm | 12+ | `npm install -g pnpm` or https://pnpm.io/install |
| NestJS CLI | 10.x | `pnpm add -g @nestjs/cli` |

Verify:
```bash
node --version        # v20.x
pnpm --version        # 12.x
nest --version        # 10.x
```

### Frontend (Kotlin Multiplatform)

| Tool | Version | Install |
|---|---|---|
| JDK | 17+ | https://adoptium.net/ |
| Android Studio | Latest | https://developer.android.com/studio |
| Gradle Wrapper | Included | `gradlew` / `gradlew.bat` |
| Docker | Any | https://www.docker.com/ (for API client generation) |

Environment variables:
```bash
export ANDROID_HOME="$HOME/Android/Sdk"      # Linux/macOS
export JAVA_HOME="/usr/lib/jvm/java-17-openjdk"  # adjust to your JDK path
export PATH="$ANDROID_HOME/tools:$ANDROID_HOME/platform-tools:$PATH"
```

Verify:
```bash
java -version        # 17.x
which android        # Android SDK tools
docker --version     # 20.x+
```

---

## Project setup

### 1. Clone and install

```bash
cd /path/to/surface-volume-monorepo

# Install backend dependencies
cd packages/backend-nestjs
pnpm install

# From root, install everything
cd ../..
pnpm install
```

### 2. Backend (NestJS)

```bash
cd packages/backend-nestjs

# Development mode (watches for changes)
pnpm run start:dev

# Production build
pnpm run build

# Run tests
pnpm run test
```

The backend serves:
- REST API on `http://localhost:8080`
- Swagger UI on `http://localhost:8080/api`
- OpenAPI JSON on `http://localhost:8080/api-json` (written to `openapi.json` on startup)

### 3. Frontend

Web (React):

```bash
# From the repo root
pnpm dev:web      # dev server
pnpm build:web    # type-check + bundle
```

Mobile/desktop (Kotlin Multiplatform):

```bash
cd packages/frontend-kmp

# Run shared module tests (JVM only, no device needed)
./gradlew :shared:test

# Decode the API fixtures into the shared DTOs
./gradlew :core:jvmTest

# Install on Android emulator/device
./gradlew :androidApp:installDebug
```

Both UIs read the same API shape from `packages/contract` (types derived from the
backend's graph) and the same demo JSON from `packages/contract/fixtures`.

---

## API contract for the current mocks

Until the endpoints exist, `packages/contract` is the API. `types.ts` derives the
workflow graph from `packages/backend-nestjs/src/workflow/workflow.types.ts`, and
`fixtures/*.json` is read by **both** clients: the React app imports it directly,
`:core` decodes it into `@Serializable` DTOs with `ignoreUnknownKeys = false`.
That decode runs in `:core:jvmTest`, so a fixture and a DTO cannot drift apart
without failing the build.

---

## Type sharing: OpenAPI -> API clients

The frontends call the backend through generated API clients, so the API contract is type-safe and changes in the backend are caught at compile time.

### How it works

NestJS DTOs (@nestjs/swagger decorators)
        |
        v openapi.json  (written by src/main.ts on startup)
                  |
                  v scripts/generate-api-client.sh
                            |
                            +-> packages/api-client-kt/   (generated Kotlin Multiplatform client, uses Ktor)
                            |                               |
                            |                               v
                            |                          frontend-kmp/shared/   (imports generated client)
                            |
                            +-> packages/api-client-ts/   (generated TypeScript/Axios client)
                                        |
                                        v
                                  packages/web/   (imports via @api-client alias)

### Generate both clients locally

```bash
# From repo root
bash scripts/generate-api-client.sh
```

Requires Docker (uses `openapitools/openapi-generator-cli`).

The script:
1. Ensures the OpenAPI spec exists (builds/starts NestJS if needed)
2. Generates the Kotlin Multiplatform client (library=multiplatform, Ktor-based) -> packages/api-client-kt/
3. Generates the TypeScript/Axios client -> packages/api-client-ts/

### Kotlin client usage (KMP)

```kotlin
import surfacevolume.api.client.AuthApi
import surfacevolume.api.models.SignInDto

val api = AuthApi(baseUrl = "http://localhost:8080")
val response = api.authControllerSignIn(SignInDto("user@example.com", "password"))
if (response.success) {
    val tokens = response.body()
    // tokens.accessToken, tokens.refreshToken
}
```

The generated client is copied into packages/frontend-kmp/shared/src/commonMain/kotlin/ so it's available on all KMP targets (JVM, Android, iOS, JS, Wasm).

### TypeScript client usage (Astro)

```ts
import { authApi } from '@/lib/api-client'

const response = await authApi.authControllerSignIn({
  email: 'user@example.com',
  password: 'password',
})
```

The generated client is not meant to be hand-edited — it is always regenerated from the OpenAPI spec.

---

## Observability

All telemetry is self-hosted OpenTelemetry, visualised in Grafana. The deployment
is split into three Compose projects so the monitoring backends are deployed once,
not alongside every app instance. See `docs/adr/0012-observability.md` for the
decision and rejected alternatives.

Start everything (from the repo root). The generated API clients are gitignored,
so generate them once before building the web image:

```bash
pnpm generate:api-client             # requires Docker
cp .env.example .env                 # then edit the secrets
docker network create surface-net    # once per host
docker compose -f deploy/datastores/docker-compose.yml up -d
docker compose -f deploy/observability/docker-compose.yml up -d
docker compose -f deploy/app/docker-compose.yml up -d --scale runner=3
```

| Endpoint | URL |
|---|---|
| Grafana | http://localhost:3001 (admin / value of `GF_SECURITY_ADMIN_PASSWORD`) |
| Prometheus | http://localhost:9090 |
| Tempo | http://localhost:3200 |
| Loki | http://localhost:3100 |
| OTel Collector | `otel-collector:4318` on `surface-net` |
| Web app (Astro SSR) | http://localhost:4321 |
| Backend health | http://localhost:8080/health and /health/ready |

Three dashboards are provisioned automatically under the **Surface Volume**
folder: *Service overview*, *Queue and workflows*, and *Runner fleet*. Alert
rules are provisioned into Grafana Alerting (in-app only; no notification channel
is configured).

The backend preloads the OTel SDK via `NODE_OPTIONS --require
./dist/telemetry/instrumentation.js` (see `packages/backend-nestjs/entrypoint.sh`).
The Astro SSR web server does the same with `--require ./telemetry.cjs`, and its
auth proxy calls carry spans (`Web.signIn`, `Web.getMe`, …) that join the same
trace as the backend. Traces, metrics and logs are exported over OTLP/HTTP using
the standard `OTEL_*` variables in `deploy/app/docker-compose.yml`. The runner
does the same through `packages/runner-rs/src/telemetry.rs`. A trace that starts
when a workflow step is enqueued continues in the Rust runner via
`trace.traceparent` in the job payload and in the `traceparent` header of
internal API calls.

Sensitive headers and JSON keys (`token`, `secret`, `password`, API keys,
credentials, …) are masked as `[REDACTED]` in both services before being exported.

### Running the services in dev mode (no app containers)

Postgres and Redis can stay in `deploy/datastores` (or come from devenv on their
default ports). Run the app processes on the host with env overrides:

```bash
# Backend
cd packages/backend-nestjs
DATABASE_URL='postgresql://postgres:postgres@localhost:5433/surface_volume?schema=public' \
REDIS_HOST=localhost REDIS_PORT=6380 \
INTERNAL_SERVICE_TOKEN=change-me \
CONNECTION_KEY="$(openssl rand -base64 32)" \
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318 \
NODE_OPTIONS='-r ts-node/register -r ./src/telemetry/instrumentation.ts' \
pnpm run start:dev

# Web (separate terminal)
cd packages/web
PUBLIC_BACKEND_URL=http://localhost:8080 pnpm run dev

# Runner (separate terminal)
cd packages/runner-rs
REDIS_URL=redis://localhost:6380 API_BASE_URL=http://localhost:8080 \
INTERNAL_SERVICE_TOKEN=change-me \
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318 \
cargo run -- work
```

The observability stack can keep running in Docker; the host processes reach the
collector at `localhost:4318`. `CONNECTION_KEY` must be the same random 32-byte
base64 value for both dev and Compose, otherwise saved connections cannot be
decrypted.

---

## Commands reference

| Command | Where | What it does |
|---|---|---|
| `pnpm install` | root | Install all workspace dependencies |
| `pnpm run start:dev` | `packages/backend-nestjs` | Start NestJS in watch mode |
| `pnpm run build` | `packages/backend-nestjs` | Build NestJS for production |
| `./gradlew :shared:test` | `packages/frontend-kmp` | Run shared module tests |
| `./gradlew :core:jvmTest` | `packages/frontend-kmp` | Decode the contract fixtures into the Kotlin DTOs |
| `./gradlew :androidApp:installDebug` | `packages/frontend-kmp` | Install Android app on device |
| `pnpm dev:web` | root | Start the React dev server |
| `pnpm build:web` | root | Type-check and bundle the React app |
| `bash scripts/generate-api-client.sh` | root | Generate Kotlin + TypeScript clients from OpenAPI |
| `docker compose -f deploy/datastores/docker-compose.yml up -d` | root | Start Postgres + Redis for the app stack |
| `docker compose -f deploy/observability/docker-compose.yml up -d` | root | Start Collector, Tempo, Prometheus, Loki and Grafana |
| `docker compose -f deploy/app/docker-compose.yml up -d --scale runner=3` | root | Start the web app, backend and three runners |

---

## Documentation

- `docs/adr/` — Architecture Decision Records (10 ADRs)
- `decision/RECOMMENDATION.md` — Stack selection rationale
- `docs/STACK-DECISION.md` — Full stack decision document
- `spikes/` — Technology spikes and comparisons
- `packages/frontend-kmp/README.md` — KMP-specific setup guide
