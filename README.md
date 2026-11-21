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

---

## Documentation

- `docs/adr/` — Architecture Decision Records (4 ADRs)
- `decision/RECOMMENDATION.md` — Stack selection rationale
- `docs/STACK-DECISION.md` — Full stack decision document
- `spikes/` — Technology spikes and comparisons
- `packages/frontend-kmp/README.md` — KMP-specific setup guide
