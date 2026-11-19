# Surface Volume — Monorepo

Automation platform: NestJS backend + Kotlin Multiplatform frontend, with a generated Kotlin API client from the NestJS OpenAPI spec.

```
surface-volume-monorepo/
├── packages/
│   ├── backend-nestjs/     # NestJS REST API (TypeScript)
│   ├── contract/           # API types + JSON fixtures, read by web and Kotlin
│   ├── web/                # React web app (Vite + TypeScript + Tailwind)
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

## Type sharing: OpenAPI → Kotlin client

The frontend calls the backend through a **generated** Kotlin client, so the API contract is type-safe and changes in the backend are caught at compile time.

### How it works

```
NestJS DTOs (@nestjs/swagger decorators)
        │
        └─▶ openapi.json  (written by src/main.ts on startup)
                  │
                  └─▶ scripts/generate-api-client.sh
                            │
                            ▼
                   packages/api-client/   (generated Kotlin client)
                            │
                            ▼
                   frontend-kmp/shared/   (imports generated client)
```

### Generate the client locally

```bash
# From repo root
bash scripts/generate-api-client.sh
```

Requires Docker (uses `openapitools/openapi-generator-cli`).

### What you get

Generated Kotlin classes in `packages/api-client/`:

```kotlin
// Example usage in shared Kotlin code
val api = ApiClientFactory.create()      // DefaultApi from OpenAPI
val workflows: List<WorkflowDto> = api.getWorkflows()  // type-safe data class
```

---

## CI/CD — API client regeneration

`.github/workflows/generate-api-client.yml` runs on pushes to `main`/`develop` that touch `packages/backend-nestjs/`:

1. Builds the NestJS backend
2. Starts the server and fetches `openapi.json`
3. Runs OpenAPI Generator to produce the Kotlin client
4. Commits the regenerated client back to the repo (no manual client commits)

The generated client is **not** meant to be hand-edited — it is always regenerated from the OpenAPI spec.

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
| `bash scripts/generate-api-client.sh` | root | Generate Kotlin client from OpenAPI |

---

## Documentation

- `docs/adr/` — Architecture Decision Records (4 ADRs)
- `decision/RECOMMENDATION.md` — Stack selection rationale
- `docs/STACK-DECISION.md` — Full stack decision document
- `spikes/` — Technology spikes and comparisons
- `packages/frontend-kmp/README.md` — KMP-specific setup guide
