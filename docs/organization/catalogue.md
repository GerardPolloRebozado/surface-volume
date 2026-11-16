# Catalogue

What each additional feature has to show. Hours and which hand-in each feature belongs to are in [PLAN.md](PLAN.md).

Difficulty in the subject is 1 small, 2 medium, 3 large, including tests and documentation.

AI-EVAL comes after AI-NODE, because the subject requires the node before the evaluation counts. SYS-K8S comes after SYS-HEALTH and SYS-SECRETS, because the subject requires both.

## MVP

### AI-PROMPT — 8h

Every instruction sent to a model lives in a versioned file outside the source, with an id and a date. The running version is configuration, and a rollback applies on the next run. One command compares two versions over at least ten committed inputs and prints the same named measure for each. Two dated comparisons are committed. A deterministic stand-in is enough. AI-NODE is not required for this feature.

### ENG-ADR — 4h

At least three significant architecture decision records are committed, one of them about the workflow engine. The stack records already in `docs/adr/` count. Each record gives context, real alternatives, the decision, and the accepted consequences. Rejected alternatives are rejected for this project, not declared universally bad. Records are dated and carry a status. A superseded decision points at its replacement.

### ENG-ASYNC — 20h

Workflow execution continues outside the request that accepted the trigger, and that request answers before the work is finished. A queue carries the pending work. A worker separate from the API process can be stopped, with work left queued, then restarted without losing that work. Third-party waits stop at a documented timeout. Worker capacity is configuration. The note explains the broker, a kill mid-job, and the limit of at-least-once delivery.

### ENG-EXT — 12h

Node implementations share one documented interface for validation and execution. Node types register at startup, isolated from the walk itself, with no dynamic loading of third-party code. Adding the last node type does not change the engine: that commit touches only the new node and its registration. `HOWTOCONTRIBUTE.md` contains a procedure someone else can follow. A new Action or REAction appears in the discovery document without a second hardcoded catalogue and without a change to the payload shape.

### SEC-DEPS — 6h

Dependency scanning runs on every contribution for the server and for both clients. A stated severity threshold fails the check, and that failure is visible on the contribution. The current report is reachable. Accepted findings record a rationale and a compensating measure. The note explains how a newly disclosed vulnerability gets attention.

### SEC-SSRF — 16h

Before the protection exists, the attack is demonstrated against a target the group controls, and the impact is stated. User-supplied addresses in private, loopback, and reserved ranges are rejected, and the check is tried at least three times. A target that resolves differently at check time and at connection time is blocked, and the mechanism and its limits are documented. Redirects are not followed, or they are checked again with the same rules. Accepted schemes follow a documented allow list. A blocked call leaves a record an operator can inspect. Outbound calls stop at a stated timeout and a maximum response size. The Discord webhook host check is part of this feature, not a substitute for it.

### SYS-HEALTH — 6h

A machine-readable HTTP health endpoint reports each dependency separately: at least the database, the third-party authentication providers, and whatever runs the hooks. A required dependency failure turns the HTTP status into a failure. Stopping the database container makes the body name the database. Checks are bounded so the endpoint answers within one second even when a dependency is unreachable. No secret, connection string, or stack trace is exposed.

### SYS-SECRETS — 8h

Secret scanning of the current tree and the history is clean, or every historical secret is recorded as revoked with proof. `.env.example` documents every required variable with a description and a harmless placeholder. A fresh clone configured from that file starts. Secrets reach containers through the environment, never through committed files or layers in the image. A known dummy secret does not appear in a full run's logs.


## Final

### AI-GUARD — 16h

A committed corpus of at least twenty payloads states the effect each one attempts. A command runs each payload through the node and reports that the declared keys are unchanged and that the attempted effect did not happen. Third-party text is never treated as an instruction. The categories of personal data removed before a request leaves are a fixed list in the node configuration. Three planted identifiers are absent from the outbound request and restored in the node output. Blocked attempts are recorded with their date and the AREA they came from. Demonstrated on an implementation that returns its input unchanged, with no model called.

### AI-MULTIMODAL — 18h

A node turns a sound recording or an image from an earlier node into text, published through the normal key path, and a later node consumes it. A deterministic stand-in returns the same text twice for the same input. Stated size and duration limits refuse an oversized payload and name the limit. An unsupported format is refused at the node and ends the run in the documented state. Retention and location of the payload are stated and can be checked when the payload is kept.

### AI-NODE — 32h

An AI node takes part in the ordinary workflow and key-path mechanism. Model access sits behind an abstraction with a real implementation and a deterministic one, and switching them is configuration. Deterministic runs are reproducible with nothing leaving the machine. Cost is bounded by a documented quota, timeout, and size limit, each shown by what the user sees when it is reached. A repeated identical call does not make a second outbound request. A dry run shows what would be sent without sending it. Two use cases have declared input and output shapes. A key path to an undeclared key is refused when the workflow is saved.

### AI-EVAL — 16h

Depends on AI-NODE. A committed labelled set of at least fifteen examples documents how, and by whom, the labels were produced. A reproducible command computes a metric appropriate to the use case. The same measurement runs against the deterministic implementation as a control. Two dated measurements show a visible change and name the model that was evaluated. The note connects the need, the implementation, the metric, and the weaknesses of the set.

### AI-REVIEW — 18h

A review node suspends the run, and nothing after it executes. The suspended run survives a restart. The web client lists pending reviews with the value produced before them, and an approval resumes the chain. A value edited before approval is what the following nodes receive. A rejection ends the run as rejected, distinct from failed. An unanswered review reaches the configured terminal state after the configured delay. The mobile client lists pending reviews and does not act on them. Demonstrated on a chain that produces a constant value. AI-NODE is not required.

### ENG-ADMIN — 16h

An administrator role protects an administration area, and a normal user is refused. Administrators can inspect and disable users and services. A disabled user can no longer authenticate, and an AREA on a disabled service stops triggering. Administrators can inspect a user's AREA without learning third-party tokens. State-changing administrative actions are audited with actor and time. The administration area links to execution records rather than copying them.

### ENG-RETRY — 16h

Failed nodes are retried automatically a bounded number of times with growing delays. The policy, the attempt count, and the delays are configuration. A side-effecting REAction is protected against doing the same effect twice during a retry, and the mechanism is explained. Exhausted work is kept in a dead-letter store that can be inspected and replayed. Removing the cause and replaying a dead-lettered run succeeds. The architecture note says how retry, persistence, and idempotence depend on each other. This feature does not require the queue.

### ENG-TEMPLATES — 24h

A user exports an AREA from the web client as one portable file with no credentials and no tokens. Another user imports it and binds it to their own service subscriptions. A missing subscription is reported by name and nothing is created. A tampered or structurally invalid file is rejected and nothing is created. The format is documented and versioned, including what happens to an older version.

### SEC-AUTH — 18h

Accepted redirect targets follow an exact allow list, and a close but invalid target is rejected. An unsolicited or replayed callback is rejected. Authorization-code interception is mitigated, and the note explains the mechanism and its limits. The same protections are demonstrated on the mobile login, not only in the browser. Registration and authentication are rate limited, with the limits documented. Exceeding a limit returns the dedicated HTTP status and a retry signal. A legitimate user is never locked out permanently, and the recovery behavior is stated. Limited attempts are recorded with address and time, never with the password. Two indicators of such an attack are documented. The security-evidence note covers the scenario, how to reproduce it, where the control lives, what it stops, and what it does not stop.

### SEC-CRYPTO — 14h

A note shows what a database dump exposed before encryption, using fake tokens, and identifies the sensitive fields. Third-party tokens are then encrypted with an authenticated cipher, and ciphertext is what a reader finds in the database. The key lives outside the source, the repository, and the database, and its provisioning is documented. A full AREA run logs neither the clear token nor the ciphertext. Rotation is documented, including rows encrypted with the previous key. Altering one byte of the stored ciphertext makes the next use fail. Evidence follows the same security-note shape as SEC-AUTH.

### SEC-GDPR — 16h

A committed data inventory maps personal data to purpose, storage location, and retention. An authenticated user exports their data from the web client as a machine-readable file. Account deletion leaves no personal data beyond what is documented as deliberately kept, with the justification. Deletion revokes or destroys delegated third-party tokens. Retention of execution records is stated and enforced. What deletion means for backups is documented: rewritten, expired within a stated delay, or replayed on restore.

### SEC-THREAT — 24h

A threat model covers workflow execution and outbound calls, not only login, with a stated method that names assets, entry points, and trust boundaries. One plausible attack chain is written step by step, from initial access to impact. Each step states its mitigation and whether that mitigation exists today. Each step identifies at least one detection opportunity. The group plays the chain in an environment it controls and keeps evidence of each step. At least two detection indicators are implemented, and replaying the chain raises them where the model says they should.

### SYS-BACKUP — 14h

Timestamped database backups run on a schedule and are stored outside the database container. One documented command restores a backup. Destroying the data and restoring it brings the product back on the previous data. The worst-case data loss is stated and follows from the schedule. Third-party tokens in backups are encrypted, or the note states what protects them. This lines up with SEC-CRYPTO and with the deletion rule in SEC-GDPR.

### SYS-K8S — 32h

Kubernetes manifests for the whole product are versioned in a dedicated directory: deployments, services, entry point, configuration, and secrets. The product runs on a local or managed cluster during the defense, and the web client is reachable through that entry point. The server runs with more than one replica and keeps answering when one replica is deleted. Configuration and secrets come from cluster objects. The group diagnoses a deliberately broken component from the cluster command line. SYS-HEALTH and SYS-SECRETS are already in the MVP, which this feature builds on.

### SYS-OBS — 28h

Every workflow run writes a persisted record: the AREA, the user, the timing, the nodes that ran with their inputs and outputs, and the outcome. Finished runs are never rewritten, and the enforcement of that rule is explained. Run count, failure rate, and duration are exposed over HTTP in a documented format that an off-the-shelf monitoring tool reads without an adapter. A dashboard comes up with the stack, populated after a few runs, with no manual setup. From the web client alone, someone can see how much the product ran over a period and which AREA fails most. History, metrics, and the web views read that one store. The administration area links here instead of keeping a second copy.

### SYS-RELEASE — 16h

Every integration into the main branch builds the server and web client images once, tags them with the commit they come from, and publishes them. Pushing a version tag produces a release by automation: the published images, the installable Android application, a changelog since the previous release. The deployment runs those published images and does not build again on the target. The version the running product reports matches a release and its commit. A deployment whose post-deploy check fails is stopped and the previous release is put back without a person intervening. One documented command redeploys any earlier release. A live status badge in the README shows the main branch and links to its latest run. The plain "deploy from CI" task in the common base is the step this feature extends. It does not replace it.
