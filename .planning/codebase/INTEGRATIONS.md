# External Integrations

**Analysis Date:** 2026-08-26

## APIs & External Services

**Study resources:**
- YouTube - generated search-result links for study topics; no YouTube API client or server-side calls. Implemented in `apps/api/src/study-plan/study-plan.service.ts`.
  - SDK/Client: None; URL construction with the standard `URL`/string APIs
  - Auth: None

**User communication:**
- Local email client - contest requests and question reports prepare browser `mailto:` messages for user confirmation; the server does not send mail. Implemented in `apps/web/app/concursos/page.tsx` and `apps/web/components/question-report.tsx`.
  - SDK/Client: Browser `mailto:` navigation
  - Auth: User’s configured mail application

**Source/reference websites:**
- Public web URLs are stored as documentation or generated links (for example, the ENEM reference in `README.md`); no HTTP SDK integration or scheduled fetcher is detected in application code.

## Data Storage

**Databases:**
- PostgreSQL 17 (Alpine Docker image) - users, sessions, contests, exams, questions, attempts, study progress, and timing data.
  - Connection: `DATABASE_URL`
  - Client: Prisma Client 6.19.3 via `apps/api/src/prisma/prisma.service.ts`
  - Provisioning: `docker-compose.yml` exposes the container on host port 5433 and persists volume `dataprev_postgres_data`.

**File Storage:**
- Local filesystem only - uploaded contest PDFs are stored below `uploads/concursos/<contest-id>` (override with `CONTEST_UPLOAD_ROOT`) by `apps/api/src/contests/contests.service.ts`.
- Local JSON file - question reports append to `apps/api/data/reported-question-errors.json` (override with `QUESTION_REPORTS_FILE`) through `apps/api/src/questions/question-reports.service.ts`.
- Checked-in source PDFs, generated images, JSON manifests, and spreadsheets support extraction scripts under `provas/`, `enem/`, `apps/api/prisma/data/`, and `apps/api/prisma/data/images/`.

**Caching:**
- None detected. Browser state/session context is maintained by React and cookie-backed API authentication, not a shared cache.

## Authentication & Identity

**Auth Provider:**
- Custom database-backed authentication - username/password login is implemented by `apps/api/src/auth/auth.service.ts` and `apps/api/src/auth/auth.controller.ts`.
  - Passwords: PBKDF2-SHA512 hashing with per-password random salt in `apps/api/src/auth/password.ts`.
  - Sessions: random opaque token in an HTTP-only cookie; only its SHA-256 hash is stored in PostgreSQL (`AuthSession` in `apps/api/prisma/schema.prisma`).
  - Authorization: global Nest `AuthGuard` with `@Public()` exceptions in `apps/api/src/auth/auth.guard.ts`.
  - Cross-origin requests: credentials-enabled CORS, origins from `WEB_ORIGIN`, configured in `apps/api/src/main.ts`.

## Monitoring & Observability

**Error Tracking:**
- None detected. No Sentry, OpenTelemetry, hosted monitoring, or metrics client is configured.

**Logs:**
- Default Node/Nest process output and launcher status output; no structured logging package is present. Local extraction scripts write JSON/audit artifacts rather than sending telemetry (`scripts/`, `automacoes/`).

## CI/CD & Deployment

**Hosting:**
- Local Docker Compose for PostgreSQL (`docker-compose.yml`); Next.js emits standalone output through `apps/web/next.config.ts`.
- No cloud hosting manifest, reverse-proxy configuration, or deployment provider integration is detected.

**CI Pipeline:**
- None detected. Root commands in `package.json` provide build, lint, test, database setup, and data extraction entry points.

## Environment Configuration

**Required env vars:**
- `DATABASE_URL` - Prisma PostgreSQL connection.
- `PORT` and optional `HOST` - API listener (`apps/api/src/main.ts`).
- `WEB_ORIGIN` - allowed credentialed CORS origins.
- `NEXT_PUBLIC_API_URL` - browser API base URL (`apps/web/lib/api.ts`).
- Optional `CONTEST_UPLOAD_ROOT` and `QUESTION_REPORTS_FILE` - local storage overrides.

**Secrets location:**
- Ignored environment files (`.env`, `.env.local`, and workspace-local variants) are present/expected; their contents are not documented. No external secret manager integration is detected.

## Webhooks & Callbacks

**Incoming:**
- None detected. The API exposes application endpoints under `/api`, but no third-party webhook receiver exists.

**Outgoing:**
- No server-to-server callbacks. Browser-only `mailto:` composition and external YouTube search links are the only user-triggered external handoffs (`apps/web/app/concursos/page.tsx`, `apps/web/components/question-report.tsx`, `apps/api/src/study-plan/study-plan.service.ts`).

---

*Integration audit: 2026-08-26*
