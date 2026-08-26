# Codebase Concerns

**Analysis Date:** 2026-08-26

## Tech Debt

**Question workflow concentration:**
- Issue: Attempt creation, draft persistence, submission, result calculation, history, and deletion are concentrated in a 1,518-line service.
- Files: `apps/api/src/questions/questions.service.ts`, `apps/api/src/questions/questions.controller.ts`
- Impact: Changes to one simulation mode can accidentally affect unrelated modes, and the service is difficult to review or test incrementally.
- Fix approach: Split selection/start, draft lifecycle, submission/scoring, and reporting queries into focused services while retaining the controller contract; add characterization tests around each mode before moving code.

**Frontend page concentration:**
- Issue: The simulation setup page contains roughly 1,363 lines of client-side state, filtering, persistence, and presentation logic.
- Files: `apps/web/app/simulado/page.tsx`, `apps/web/app/simulado/[id]/page.tsx`
- Impact: UI state transitions and API calls are tightly coupled, making regressions likely when adding modes or changing draft behavior.
- Fix approach: Extract mode-specific panels, selection/state hooks, and draft synchronization into `apps/web/components/` or feature modules; keep the route page as composition.

**Disabled contest creation path:**
- Issue: The service implements PDF validation, filesystem storage, and database creation, but the public POST endpoint deliberately always returns `503`.
- Files: `apps/api/src/contests/contests.service.ts`, `apps/api/src/contests/contests.controller.ts`, `apps/web/app/concursos/page.tsx`
- Impact: The implemented upload path is dead code and can drift from the user-facing “Solicitar concurso” flow; enabling it later will require revalidating security and cleanup behavior.
- Fix approach: Either remove the unused server upload path until it is supported, or finish it with explicit authorization, upload limits, persistent storage, and integration tests before exposing it.

## Known Bugs

**Report persistence can silently lose or corrupt data across processes:**
- Symptoms: Reports are serialized by reading and rewriting one JSON array; the in-memory `writeQueue` only coordinates calls within one Node process.
- Files: `apps/api/src/questions/question-reports.service.ts`, `apps/api/data/reported-question-errors.json`
- Trigger: Concurrent API replicas, process restarts during `writeFile`, or a large report file.
- Workaround: Run a single API process and periodically back up the JSON file.

**Study-time summaries can double-count overlapping sessions:**
- Symptoms: Every session contributes its full interval, while `startStudyTimer` only checks for an existing open session at the instant it runs.
- Files: `apps/api/src/dashboard/dashboard.service.ts`
- Trigger: Repeated start requests arriving concurrently or multiple open sessions created by separate API workers.
- Workaround: Pause before starting again and avoid concurrent requests.

## Security Considerations

**Known default credentials:**
- Risk: A predictable account (`Emiliano` / `123`) is recreated by every seed run, and the same credentials are documented for initial access.
- Files: `apps/api/prisma/seed.ts`, `README.md`
- Current mitigation: Passwords are stored as PBKDF2 hashes and sessions use random opaque tokens stored as SHA-256 hashes.
- Recommendations: Require an environment-provided bootstrap password or one-time setup flow, refuse weak production credentials, and remove credentials from operational documentation.

**Hard-coded database credentials in local infrastructure:**
- Risk: The compose file uses a fixed PostgreSQL username/password, and the documented connection string repeats it. Reuse in a reachable deployment would expose the database.
- Files: `docker-compose.yml`, `README.md`, `.env.example`
- Current mitigation: The values are intended for local development and `.env` files are ignored.
- Recommendations: Parameterize compose credentials, bind Postgres to localhost unless remote access is required, and document separate production secret management.

**No login throttling or account lockout:**
- Risk: `/api/auth/login` accepts unlimited password attempts, enabling brute-force attacks against the seeded account.
- Files: `apps/api/src/auth/auth.controller.ts`, `apps/api/src/auth/auth.service.ts`, `apps/api/src/main.ts`
- Current mitigation: Invalid credentials return the same generic unauthorized message.
- Recommendations: Add IP/account rate limiting, exponential backoff or temporary lockout, and audit logging for repeated failures.

**Cross-site request protections are implicit:**
- Risk: Mutating endpoints authenticate through a cookie and rely on `SameSite=Lax`; there is no explicit CSRF token or origin check for state-changing requests.
- Files: `apps/api/src/auth/auth.controller.ts`, `apps/api/src/main.ts`, `apps/web/lib/api.ts`
- Current mitigation: CORS restricts configured origins and the session cookie is `httpOnly`.
- Recommendations: Add CSRF protection or strict Origin validation for mutating requests, keep `WEB_ORIGIN` narrow in production, and use `secure` cookies behind TLS.

## Performance Bottlenecks

**Dashboard loads complete histories into application memory:**
- Problem: Dashboard queries return every completed attempt, answer, and study session for the contest before calculating aggregates in TypeScript.
- Files: `apps/api/src/dashboard/dashboard.service.ts`
- Cause: Aggregation is performed with `reduce`/maps rather than database aggregates or bounded windows.
- Improvement path: Compute totals and discipline aggregates in SQL, paginate or bound trend/history inputs, and add indexes for completed attempts and answer joins.

**JSON report append is O(n) per report:**
- Problem: Each new report parses and rewrites the entire report array.
- Files: `apps/api/src/questions/question-reports.service.ts`
- Cause: File-backed append-only behavior is implemented as a whole-document rewrite.
- Improvement path: Store reports in a Prisma model or append newline-delimited records to durable storage, with a separate admin query path.

**Large query service paths lack explicit pagination:**
- Problem: Exam, topic, history, and result queries can return large collections with limits controlled only in selected endpoints.
- Files: `apps/api/src/questions/questions.service.ts`, `apps/api/src/study-plan/study-plan.service.ts`
- Cause: Several `findMany` calls build full result sets for client-side rendering.
- Improvement path: Define server-side page/limit contracts and select only fields needed by each screen; add indexes based on the resulting query plans.

## Fragile Areas

**Draft synchronization across browser storage and API:**
- Files: `apps/web/app/simulado/[id]/page.tsx`, `apps/web/app/simulado/page.tsx`, `apps/web/lib/session.ts`
- Why fragile: Answers and timing state are kept in local/session storage and periodically sent to the server, with recovery paths depending on JSON parsing and browser availability.
- Safe modification: Treat server draft data as canonical on resume, version the client payload, handle quota/storage failures explicitly, and test tab closure, stale drafts, and duplicate submissions.
- Test coverage: API service tests cover many branches, but there are no browser/E2E tests for storage recovery or synchronization races.

**Seed as migration and repair mechanism:**
- Files: `apps/api/prisma/seed.ts`, `apps/api/prisma/data/*.json`
- Why fragile: Seed upserts catalog data, rewrites topic statistics with raw SQL, and resets `questionsCompleted`/`correctAnswers` for every topic on each run.
- Safe modification: Separate immutable catalog import from user-data repair, make recalculation scoped and idempotent, and run against a disposable database in CI before changing seed SQL.
- Test coverage: No integration test runs the seed against a real PostgreSQL schema.

## Scaling Limits

**Single-instance local filesystem storage:**
- Current capacity: Contest PDFs and question reports are written under local paths, with no object storage or shared volume requirement enforced.
- Limit: Multiple API instances or ephemeral containers can see different files; a redeploy can lose uploads/reports unless the operator provisions persistent storage.
- Scaling path: Move uploads and reports to durable object/database storage, retain metadata in PostgreSQL, and define backup/retention policies.

**Unbounded per-contest historical data:**
- Current capacity: Dashboard and reporting paths process all matching attempts, answers, sessions, or JSON reports in one request/process.
- Limit: Response latency and memory grow linearly with a user’s history.
- Scaling path: Add aggregate tables/materialized summaries, pagination, retention rules, and query-level limits.

## Dependencies at Risk

**Generated/build artifacts present in the working tree:**
- Risk: `apps/api/dist`, `apps/web/.next`, and TypeScript build metadata can become stale or mask clean-build failures during local development.
- Files: `apps/api/dist/`, `apps/web/.next/`, `apps/web/tsconfig.tsbuildinfo`
- Impact: Debugging may use output from a different source revision; deployment reproducibility depends on rebuilding.
- Migration plan: Keep generated outputs ignored and disposable, run clean `npm run build` in CI, and avoid relying on checked/generated artifacts.

## Missing Critical Features

**Operational report management:**
- Problem: Question reports are written to a JSON file but there is no authenticated API or UI to list, triage, resolve, or archive them.
- Blocks: Staff cannot manage the issue queue from the application, and report status is fixed to `OPEN`.

**Production deployment controls:**
- Problem: The repository provides local Docker Compose for PostgreSQL but no documented production process for TLS, secret injection, backups, migrations, or persistent upload storage.
- Blocks: Safe multi-user deployment and disaster recovery.

## Test Coverage Gaps

**Frontend behavior:**
- What's not tested: Login/contest selection, simulation setup, timer visibility behavior, draft recovery, result rendering, and report submission in a browser.
- Files: `apps/web/app/`, `apps/web/components/`, `apps/web/lib/`
- Risk: Client/server synchronization and navigation regressions can pass the API unit suite unnoticed.
- Priority: High

**Persistence and concurrency:**
- What's not tested: PostgreSQL integration for seed/import behavior, concurrent report writes, concurrent timer starts, and transaction failure cleanup.
- Files: `apps/api/prisma/seed.ts`, `apps/api/src/questions/question-reports.service.ts`, `apps/api/src/dashboard/dashboard.service.ts`, `apps/api/src/contests/contests.service.ts`
- Risk: Data loss, duplicate sessions, or orphaned files may only appear under real database/process conditions.
- Priority: High

**Authentication abuse cases:**
- What's not tested: Brute-force throttling (not implemented), cookie/origin behavior, expired-session cleanup under load, and production cookie settings.
- Files: `apps/api/src/auth/`, `apps/api/src/main.ts`
- Risk: Security regressions and deployment misconfiguration are not caught automatically.
- Priority: Medium

---

*Concerns audit: 2026-08-26*
