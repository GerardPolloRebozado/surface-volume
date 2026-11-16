# Surface Volume — implementation plan

Status: proposed 16 November 2026. Confirm the service list in the Monday sync the same day.

This file is the task breakdown. Acceptance text for the catalogue is in [catalogue.md](catalogue.md). Monday syncs are in [meetings.md](meetings.md). It does not open new GitHub issues. Tickets that already exist are named below and stay as they are.

| Hand-in                   | Date                       |
| ------------------------- | -------------------------- |
| MVP                       | Tuesday 1 December 2026    |
| Final product and defense | Sunday 3 January 2027      |
| Feature freeze            | Wednesday 23 December 2026 |
| Rehearsal                 | Saturday 2 January 2027    |

Hours are focused work, including the first test that proves the task. They do not include review wait or the Monday meeting. Each meeting is one hour.

In the subject, an Action is the event and a REAction is the task. The existing tickets say Trigger and Action for those two things. This file uses the subject words, and points at the ticket that already covers that work.

## What the third is

The MVP is a third of the product, and that third already contains every kind of part the final product has. The month after 1 December extends that slice.

By 1 December:

- Local registration, confirmation, and login. OpenID Connect is the same flow with an external issuer, and it is scheduled after the MVP.
- Two services out of five. GitHub is the OAuth pattern that Notion and Spotify will repeat. Discord is a credential the user pastes, which is the other pattern.
- One Action and two REActions, with a condition between them. That is the workflow the MVP milestone requires: a trigger, two reactions, and one condition.
- The web client builds that workflow. Android sets the server address, signs in, and turns workflows on and off.
- 8 of the 24 catalogue features, spread across AI, engineering, security, and systems: AI-PROMPT, ENG-ADR, ENG-ASYNC, ENG-EXT, SEC-DEPS, SEC-SSRF, SYS-HEALTH, SYS-SECRETS.

Translations, the WCAG audits, the other three services, and the other 16 catalogue features are scheduled after 1 December. They are part of this plan.

## Catalogue

Every feature in the additional-features document is in this plan. Difficulty in the subject is 1 small, 2 medium, 3 large, including tests and documentation. The hours below are the estimate for meeting every acceptance line of that feature. What each feature has to show is in [catalogue.md](catalogue.md).

Catalogue total: 398h. MVP: 80h. Final: 318h.

AI-EVAL is scheduled after AI-NODE, because the subject requires the node before the evaluation counts. SYS-K8S is scheduled after SYS-HEALTH and SYS-SECRETS, because the subject requires both.

### MVP — 80h

| Id          | Feature                       | Difficulty | Hours |
| ----------- | ----------------------------- | ---------- | ----- |
| AI-PROMPT   | Prompt versioning             | 1          | 8h    |
| ENG-ADR     | Architecture decision records | 1          | 4h    |
| ENG-ASYNC   | Asynchronous execution        | 3          | 20h   |
| ENG-EXT     | Extensible connectors         | 2          | 12h   |
| SEC-DEPS    | Dependency scanning           | 1          | 6h    |
| SEC-SSRF    | SSRF protection               | 2          | 16h   |
| SYS-HEALTH  | Health checks                 | 1          | 6h    |
| SYS-SECRETS | Secrets management            | 1          | 8h    |

### Final — 318h

| Id            | Feature                  | Difficulty | Hours |
| ------------- | ------------------------ | ---------- | ----- |
| AI-GUARD      | Prompt injection defense | 2          | 16h   |
| AI-MULTIMODAL | Multimodal inputs        | 2          | 18h   |
| AI-NODE       | Autonomous AI node       | 3          | 32h   |
| AI-EVAL       | Model evaluation         | 2          | 16h   |
| AI-REVIEW     | Human validation         | 2          | 18h   |
| ENG-ADMIN     | Administration area      | 2          | 16h   |
| ENG-RETRY     | Retries and idempotency  | 2          | 16h   |
| ENG-TEMPLATES | Shareable templates      | 3          | 24h   |
| SEC-AUTH      | Authentication hardening | 2          | 18h   |
| SEC-CRYPTO    | Encryption at rest       | 2          | 14h   |
| SEC-GDPR      | Personal data compliance | 2          | 16h   |
| SEC-THREAT    | Threat modeling          | 3          | 24h   |
| SYS-BACKUP    | Backup and restore       | 2          | 14h   |
| SYS-K8S       | Container orchestration  | 3          | 32h   |
| SYS-OBS       | Observability            | 3          | 28h   |
| SYS-RELEASE   | Release automation       | 2          | 16h   |

## Services

| Service | OAuth       | By 1 December                       | By 3 January                              |
| ------- | ----------- | ----------------------------------- | ----------------------------------------- |
| GitHub  | yes         | issue opened; comment on that issue | pull request opened; create an issue      |
| Discord | no, webhook | message in a channel                | used again by the long demo               |
| Notion  | yes         | —                                   | page created in a database; create a page |
| Spotify | yes         | —                                   | track added to a playlist; add a track    |
| Clock   | no          | —                                   | scheduled tick                            |

Gmail was considered and left out. Google treats mail scopes as sensitive, and the consent screen would cost a week. Notion is enough to show a second OAuth grant.

The defense workflow uses one trigger and at least four reactions. The data model must not grow a special case for the number four. The MVP save rules already allow more than four.

## Calendar

### 16–22 November

Confirm the services. Commit the wireframes. Land the database, the JWT check, and local auth. Connector code waits until the service list is confirmed.

### 23–29 November

Service discovery, GitHub OAuth, workflow create/read/update/delete, web login and home, Compose, and CI. The engine starts against fake reactions. ENG-EXT's registration point exists before the second connector is added. ENG-ADR's engine record is written with the engine, not after it.

### 30 November – 1 December

Monday is the go/no-go. Tuesday is the hand-in: scheduler, both real reactions, ENG-ASYNC's worker, SYS-HEALTH, SEC-DEPS, SEC-SSRF, SYS-SECRETS, AI-PROMPT, and the Android golden path. Nothing new starts on Tuesday.

### 2–11 December

OIDC, Notion and Spotify, the remaining GitHub components, the clock. ENG-RETRY, SEC-AUTH, and SEC-CRYPTO. AI-GUARD and the start of AI-NODE.

### 14–23 December

AI-NODE finished, then AI-EVAL. AI-MULTIMODAL, AI-REVIEW, ENG-ADMIN, ENG-TEMPLATES. SEC-GDPR, SEC-THREAT. SYS-BACKUP, SYS-OBS, SYS-K8S, SYS-RELEASE. Both languages, both audits, and the fixes committed in the audits. Feature freeze is Wednesday 23 December.

### 24–27 December

Off.

### 28 December – 3 January

README, HOWTO, the evidence index for all 24 features, the post-mortem, and a fallback recording. 1 January is off. Rehearsal is Saturday 2 January. Sunday 3 January is the defense, not a coding day.

Monday syncs are in [meetings.md](meetings.md).

## Common base for the MVP — 172h

These hours are the product slice. Catalogue hours are in the table above and are not repeated here.

Targets are the day the task is done, not the day it starts.

### Decisions and wireframes — by 20 November

| Task                                        | Existing issue                                                         | Hours | Done when                                                                                                                                                                                                                                                                                                                                       |
| ------------------------------------------- | ---------------------------------------------------------------------- | ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Record each member's architectural question | —                                                                      | 2h    | `docs/architecture-questions.md` has one question per person and what evidence would answer it. Examples if nobody has one yet: how a graph is validated on save; how one condition takes a branch and does not merge; how one Compose UI meets WCAG AA on web and Android; how a service appears in discovery without a second hardcoded list. |
| Confirm the five Actions                    | [#23](https://github.com/GerardPolloRebozado/surface-volume/issues/23) | 3h    | The list in the services table is accepted, or replaced with another five that still cover the MVP pair and the final list. Each Action says how it is detected and how an event is identified so it does not fire twice.                                                                                                                       |
| Confirm the five REActions                  | [#39](https://github.com/GerardPolloRebozado/surface-volume/issues/39) | 2h    | The REAction list is accepted or replaced on the same terms. The MVP pair is explicit: a GitHub issue whose title matches a word either posts to Discord or comments on the issue.                                                                                                                                                              |
| Login and register wireframe                | [#32](https://github.com/GerardPolloRebozado/surface-volume/issues/32) | 3h    | Web and Android frames for register, confirm, login, and a rejected password are in the repo. Android shows where the API address is set.                                                                                                                                                                                                       |
| Home wireframe                              | [#21](https://github.com/GerardPolloRebozado/surface-volume/issues/21) | 3h    | Both clients show an empty list and a list with one workflow, including enable, disable, and a failed last run. Android has no builder.                                                                                                                                                                                                         |
| Builder wireframe                           | [#22](https://github.com/GerardPolloRebozado/surface-volume/issues/22) | 4h    | A step form, not a free canvas: one trigger, an optional condition, reactions on two branches, and a field that inserts a value from an earlier step. The frame says why a canvas does not fit this window.                                                                                                                                     |
| Wireframe index                             | [#20](https://github.com/GerardPolloRebozado/surface-volume/issues/20) | 1h    | One page in the repo points at the three frames and says which screens are in the MVP.                                                                                                                                                                                                                                                          |

### Identity and storage — by 23 November

| Task                      | Existing issue                                                         | Hours | Done when                                                                                                                                                                                                                                                                                                        |
| ------------------------- | ---------------------------------------------------------------------- | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Persistence model         | [#30](https://github.com/GerardPolloRebozado/surface-volume/issues/30) | 8h    | Migrations for users, subscriptions, delegated credentials, workflows, runs, and events already seen. Workflow structure is JSONB and does not cap the number of reactions. Deleting a user has a written rule. The credential column is the one SEC-CRYPTO wraps later.                                         |
| JWT middleware            | [#34](https://github.com/GerardPolloRebozado/surface-volume/issues/34) | 5h    | Workflow and subscription routes return 401 without a valid token. The token identifies the user. A claim is added only if a route checks it. The secret comes from the environment. OpenAPI marks the protected routes.                                                                                         |
| Register, confirm, log in | [#33](https://github.com/GerardPolloRebozado/surface-volume/issues/33) | 10h   | Password is hashed. Confirm token works once. Login before confirm is rejected. In local development the confirm token is printed in the server log. A wrong password and an unknown user return the same status. OpenAPI covers the three calls and the errors. Rate limits are SEC-AUTH, estimated separately. |

### Catalogue API and workflow API — by 27 November

| Task                                | Existing issue                                                         | Hours | Done when                                                                                                                                                                                                                                                                                                                                                                     |
| ----------------------------------- | ---------------------------------------------------------------------- | ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Service discovery and subscriptions | —                                                                      | 8h    | An authenticated GET returns identifiers, descriptions, and parameters. The MVP payload is GitHub and Discord only, and later services appear there without a client change. Subscribe and unsubscribe exist. A workflow that still uses a removed service is disabled or the unsubscribe is rejected, and the choice is written down. The shape is the one ENG-EXT requires. |
| GitHub OAuth subscription           | —                                                                      | 10h   | Authorization-code OAuth stores a token on that user's subscription. The token is not returned again. A second connect replaces it. The callback rejects a state value the server did not issue. Disconnect removes the token. The allow list and the replay rules are finished under SEC-AUTH.                                                                               |
| List workflows                      | [#35](https://github.com/GerardPolloRebozado/surface-volume/issues/35) | 3h    | The caller sees only their workflows, with id, name, enabled flag, and the last run when one exists. The empty list is a 200.                                                                                                                                                                                                                                                 |
| Create a workflow                   | [#36](https://github.com/GerardPolloRebozado/surface-volume/issues/36) | 6h    | Save accepts one trigger, zero or one condition, and reactions. Branches do not merge. Nested conditions are rejected. A workflow with no condition is valid. A key path the earlier node does not declare is rejected. Failures name the node.                                                                                                                               |
| Update a workflow                   | [#38](https://github.com/GerardPolloRebozado/surface-volume/issues/38) | 5h    | The same checks as create. Another user's id is not updated. A disabled workflow stays disabled unless the body changes the flag.                                                                                                                                                                                                                                             |
| Delete a workflow                   | [#37](https://github.com/GerardPolloRebozado/surface-volume/issues/37) | 2h    | The user's workflow disappears from the list and from scheduling. Someone else's id is left in place.                                                                                                                                                                                                                                                                         |
| Enable, disable, and read runs      | —                                                                      | 4h    | The home and Android screens can toggle a workflow and list recent runs with status, time, and which branch ran. A disabled workflow is skipped by the scheduler. SYS-OBS later extends this same store.                                                                                                                                                                      |

### Engine and the two reactions — by 1 December

| Task                              | Existing issue                                                         | Hours | Done when                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| --------------------------------- | ---------------------------------------------------------------------- | ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Engine, condition, and key paths  | —                                                                      | 14h   | The walk is linear. A condition takes one of two branches, and the branches end the run. Substitution fills placeholders such as `{{ trigger.title }}` and does not evaluate user text as code. A missing value fails that run and is recorded. A fixture covers both branches with fake reactions. Retry policy is ENG-RETRY. The queue around this walk is ENG-ASYNC. The registration point is ENG-EXT. The written record is ENG-ADR. |
| Compose                           | —                                                                      | 6h    | `docker compose up` starts PostgreSQL, the API, and the web client. The README states the command and the local URLs. The example env file is SYS-SECRETS.                                                                                                                                                                                                                                                                                |
| Hook scheduler and dedup          | —                                                                      | 6h    | A scheduled loop loads enabled workflows and asks the trigger for new events. An event id is stored. The same id does not create a second run. The loop queues the run through ENG-ASYNC. It does not execute it inside the tick.                                                                                                                                                                                                         |
| GitHub Action: issue opened       | [#24](https://github.com/GerardPolloRebozado/surface-volume/issues/24) | 8h    | The user chooses a repository. Polling emits title, url, and issue number. The same issue number is not emitted twice. Discovery lists the Action. This is the existing "Trigger 1" ticket.                                                                                                                                                                                                                                               |
| GitHub REAction: comment          | [#40](https://github.com/GerardPolloRebozado/surface-volume/issues/40) | 6h    | The comment body is a template. The stored token is used and does not appear in the run record or the log. A GitHub error fails the run with the status recorded and the token redacted. This is the existing "Action 1" ticket. Idempotent retry of this call is ENG-RETRY.                                                                                                                                                              |
| Discord REAction: channel message | —                                                                      | 6h    | The user supplies a webhook URL. The message body uses the same templates. Discovery does not call Discord an OAuth service. Which URLs are legal is decided in SEC-SSRF.                                                                                                                                                                                                                                                                 |

### Clients, CI, and the hand-in

| Task                   | Existing issue                                                         | Hours | Done when                                                                                                                                                                                                                                                                                                                     |
| ---------------------- | ---------------------------------------------------------------------- | ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Web register and login | —                                                                      | 6h    | The screens follow the wireframe, the API address is configurable, a failed login stays on the form, and the token is not put in the URL.                                                                                                                                                                                     |
| Home page              | [#31](https://github.com/GerardPolloRebozado/surface-volume/issues/31) | 8h    | The screen follows the wireframe, including the empty state. Enable and disable survive a reload. A failed last run is distinct. There is a way into the builder.                                                                                                                                                             |
| Web workflow builder   | [#29](https://github.com/GerardPolloRebozado/surface-volume/issues/29) | 8h    | The step form saves through the API. The user can map a declared key into a later field. A rejected save is shown. Android has no builder.                                                                                                                                                                                    |
| Android golden path    | —                                                                      | 10h   | The API address survives a restart. Login uses the same account as the web. The list toggles workflows and shows the last status. A debug build installs from the documented Gradle command.                                                                                                                                  |
| CI: lint, test, build  | —                                                                      | 8h    | Pull requests run lint, tests, and build for the NestJS server and the Kotlin client. A failing test fails the check. One test fails if an MVP route is missing from the served OpenAPI document. The existing client-generation workflow still works, or this task says what replaced it. SEC-DEPS plugs into this pipeline. |
| MVP architecture note  | —                                                                      | 3h    | `docs/architecture/mvp.md` covers the workflow model, where JSONB stops and validation starts, the missing-key rule, and the queue. It names which catalogue features are demonstrable on 1 December and which are scheduled after.                                                                                           |
| Plan review            | —                                                                      | 2h    | The section at the bottom of this file says what slipped, what evidence caused it, and the cost. A feature that moved past 1 December stays in the plan.                                                                                                                                                                      |
| Hand-in checklist      | —                                                                      | 2h    | On 1 December a clean checkout runs the story: GitHub issue, condition, Discord on one branch, GitHub comment on the other. Compose is up, the Android debug build installs, OpenAPI is browsable, CI is green, and the eight MVP catalogue features can each be shown.                                                       |

## Common base after the MVP — 214h

[#25](https://github.com/GerardPolloRebozado/surface-volume/issues/25), [#26](https://github.com/GerardPolloRebozado/surface-volume/issues/26), [#27](https://github.com/GerardPolloRebozado/surface-volume/issues/27), and [#28](https://github.com/GerardPolloRebozado/surface-volume/issues/28) are the existing "Trigger 2" through "Trigger 5" tickets. They stay on the final milestone. The rows below say what each one is.

### Services — by 16 December

| Task                                      | Existing issue                                                         | Hours | Done when                                                                                                                                                                                     |
| ----------------------------------------- | ---------------------------------------------------------------------- | ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GitHub Action: pull request opened        | [#25](https://github.com/GerardPolloRebozado/surface-volume/issues/25) | 6h    | Uses the token stored for the MVP. Payload declares title, url, and number. The same pull request is not emitted twice. Discovery lists it.                                                   |
| GitHub REAction: create an issue          | —                                                                      | 6h    | Title and body are templates. The token stays out of logs and run records. Discovery lists it.                                                                                                |
| Notion OAuth                              | —                                                                      | 8h    | Authorization-code OAuth stores a token on that user's subscription. Disconnect removes it. A workflow that required Notion follows the same unsubscribe rule as the MVP.                     |
| Notion Action: database page created      | [#26](https://github.com/GerardPolloRebozado/surface-volume/issues/26) | 8h    | The user selects a database. Payload declares page id and title. The same page does not start a second run.                                                                                   |
| Notion REAction: create a page            | —                                                                      | 8h    | The title is a template. A missing Notion subscription fails the run and does not create a page.                                                                                              |
| Spotify OAuth                             | —                                                                      | 8h    | Authorization-code OAuth stores a token, and a refresh token when Spotify issues one. Refresh runs in the worker when the token is expired. A failed refresh fails the run and does not loop. |
| Spotify Action: track added to a playlist | [#27](https://github.com/GerardPolloRebozado/surface-volume/issues/27) | 8h    | The user selects a playlist. Payload declares track id and name. A track already seen does not start another run.                                                                             |
| Spotify REAction: add a track             | —                                                                      | 8h    | The track id is a literal or a key path. Adding a track that is already on the playlist follows a documented behavior.                                                                        |
| Clock Action: scheduled tick              | [#28](https://github.com/GerardPolloRebozado/surface-volume/issues/28) | 5h    | The allowed schedule form is documented. A tick has a stable id for that instant, so a restart does not fire it twice. Discovery does not call Clock an OAuth service.                        |
| Four-reaction demonstration               | —                                                                      | 4h    | One saved workflow runs a real trigger and at least four real reactions. A fallback recording is stored for the defense. The data model is not changed to allow the fourth reaction.          |

### Auth and the engine's remaining proofs — by 16 December

| Task                                   | Existing issue | Hours | Done when                                                                                                                                                                                                                                                  |
| -------------------------------------- | -------------- | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| OpenID Connect login                   | —              | 12h   | Issuer, client id, and redirect come from the environment. A first login creates or links a local user. A later login finds the same user. Web and Android both complete the flow. Redirect allow lists, replayed callbacks, and rate limits are SEC-AUTH. |
| Tests for missing keys and failed runs | —              | 4h    | A missing key ends the run as failed and records the node and the key. A condition with a missing value takes the documented branch or fails, and a test locks that choice. No test path evaluates template text as code.                                  |
| English and French                     | —              | 12h   | The user can switch language and the choice survives a restart. Register, confirm, login, the home list, enable and disable, and the web builder are translated on web and on Android. A missing translation is visible in review.                         |
| WCAG AA audit, web                     | —              | 8h    | `docs/accessibility/` names the tool and the screens (register, login, home, builder, run result), lists findings against AA, and says what was fixed and what was left.                                                                                   |
| WCAG AA audit, Android                 | —              | 8h    | The same kind of report for server address, register, login, the workflow list, and the run result. The builder is recorded as out of scope on mobile, with the subject rule that says so.                                                                 |
| Fix the findings we commit to          | —              | 8h    | Each finding marked fixed is gone on a re-run of the named tool. Findings marked open are still open, and the report still explains them.                                                                                                                  |
| Visual consistency                     | —              | 8h    | Login and the workflow list match between web and Android. The web home and builder work at a phone width and at a desktop width. Empty, loading, and error states exist. No new product behavior.                                                         |
| Android run history                    | —              | 6h    | A workflow on the phone shows recent runs with status and time, and the node the server reported when a run failed. Still no builder. Pending reviews from AI-REVIEW are listed here and are not actionable.                                               |

### Proof, documents, and the defense

| Task                                     | Existing issue | Hours | Done when                                                                                                                                                                                                                                                                                                                       |
| ---------------------------------------- | -------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| README                                   | —              | 4h    | A stranger can set up, start Compose, open the local URLs, and install a debug Android build by following the file. It points at OpenAPI and at health. The status badge is part of SYS-RELEASE.                                                                                                                                |
| HOWTOCONTRIBUTE                          | —              | 6h    | The file is at the repository root and is the procedure ENG-EXT asks for. It walks registration, discovery, validation, and execution with one existing connector as the example.                                                                                                                                               |
| Workflow model and failure semantics     | —              | 4h    | The final note matches the code: graph rules, key paths, missing values, timeouts, retries, and what a worker crash can repeat.                                                                                                                                                                                                 |
| Persistence model                        | —              | 4h    | Tables, foreign keys, JSONB, credential storage after SEC-CRYPTO, and user deletion under SEC-GDPR. ADRs that still apply are linked. Superseded ones are marked.                                                                                                                                                               |
| Where each feature is demonstrated       | —              | 6h    | One row for each of the 24 catalogue ids, with the doc, test, or screen. For each SEC id, the evidence note is the one the subject describes.                                                                                                                                                                                   |
| OpenAPI matches the implementation       | —              | 6h    | A CI test covers the routes the clients call, including error responses. The browsable API UI is still served.                                                                                                                                                                                                                  |
| Engine unit tests                        | —              | 6h    | Linear chain, both condition branches, a rejected nested condition, an unknown key rejected on save, a missing key at runtime, a retry that does not repeat a side effect. The fakes do not open a network connection.                                                                                                          |
| Functional test of one full run          | —              | 8h    | The test uses the HTTP API against the real server and database. One case runs a fake trigger through a condition to a fake reaction. A second case shows a disabled workflow does not run. Provider HTTP is stubbed.                                                                                                           |
| Deploy from CI                           | —              | 10h   | A green main branch publishes a runnable stack without someone typing commands on a laptop, using the path ADR 0005 already points at unless a new ADR replaces it. A failed pipeline does not silently replace the running version. Tagged rollback, the changelog, and the Android artifact on a version tag are SYS-RELEASE. |
| Installable Android build from CI        | —              | 8h    | The pipeline produces an APK without a local Android Studio session, and the README says where to get it. SYS-RELEASE reuses this artifact on a version tag.                                                                                                                                                                    |
| Post-mortem                              | —              | 4h    | What the spikes showed, which work moved past 1 December and why, any feature that was larger than its category, and what would be done differently. Each member adds the decision they can defend.                                                                                                                             |
| Defense narrative and fallback recording | —              | 8h    | The deck shows the product, the architecture, and one accepted trade-off. A recording shows the four-reaction workflow. Each member can explain one decision. The live script matches a workflow that exists in the seed data or the docs.                                                                                      |
| Rehearsal                                | —              | 3h    | Run on 2 January against the hand-in build. Notes are a fix list, not a feature list.                                                                                                                                                                                                                                           |
| Hand-in checklist                        | —              | 2h    | On 3 January discovery shows the five services. The 24 catalogue features can each be shown from the evidence index. README, HOWTO, both audit reports, the post-mortem, and this plan's review section are on the commit. The four-reaction workflow has been run, live or from the recording.                                 |

## Order

The chain that decides whether 1 December is real:

1. Database, then JWT, then local auth.
2. Discovery, then GitHub OAuth.
3. Create and update workflows, then the engine.
4. Compose, then ENG-ASYNC's worker, then the scheduler.
5. The GitHub issue Action and the two REActions. SEC-SSRF is in place before a user-supplied URL is fetched.
6. Web login, then home, then the builder. Android follows the list and toggle APIs as soon as those exist.
7. CI before SEC-DEPS. SYS-HEALTH after Compose. SYS-SECRETS with the example env file. ENG-ADR with the engine. AI-PROMPT as versioned files the node will read later.

After 1 December, AI-NODE is in place before AI-EVAL. SYS-HEALTH and SYS-SECRETS are in place before SYS-K8S. SEC-CRYPTO is in place before SYS-BACKUP treats tokens in a dump. ENG-EXT's registration is how Notion, Spotify, and Clock are added.

## What changed by the MVP

Nothing yet. The 1 December review fills this in.
