<!-- refreshed: 2026-08-26 -->
# Architecture

**Analysis Date:** 2026-08-26

## System Overview

```text
┌─────────────────────────────────────────────────────────────┐
│ Next.js App Router / React client                           │
│ `apps/web/app`, `apps/web/components`, `apps/web/lib`       │
└──────────────────────────┬──────────────────────────────────┘
                           │ fetch JSON + session cookie + X-Contest-Id
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ NestJS HTTP API (`apps/api/src`)                            │
│ global AuthGuard → feature controllers → feature services   │
└──────────────────────────┬──────────────────────────────────┘
                           │ Prisma Client
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ PostgreSQL (`apps/api/prisma/schema.prisma`)                │
│ users, contests, exams/questions, attempts, study progress  │
└─────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| Web shell/context | Session bootstrap, contest selection, navigation and route UI | `apps/web/components/app-shell.tsx`, `apps/web/components/app-context.tsx` |
| Web pages | Client-side dashboard, study plan, simulation setup/player/results and contest screens | `apps/web/app/page.tsx`, `apps/web/app/simulado/page.tsx`, `apps/web/app/simulado/[id]/page.tsx` |
| API bootstrap | Nest application, CORS, global prefix and DTO validation | `apps/api/src/main.ts` |
| Auth feature | Login/logout, hashed session cookie and current-user guard | `apps/api/src/auth/` |
| Contest feature | User contest listing/update and contest ownership guard | `apps/api/src/contests/` |
| Questions feature | Exam discovery, attempt creation/drafts/submission, scoring/timing and reports | `apps/api/src/questions/` |
| Study plan feature | Contest-scoped topic catalog, progress and summary | `apps/api/src/study-plan/` |
| Dashboard feature | Aggregated scores, topic progress and study-time metrics | `apps/api/src/dashboard/` |
| Persistence | Prisma singleton and relational schema/migrations/seed | `apps/api/src/prisma/`, `apps/api/prisma/` |

## Pattern Overview

**Overall:** Monorepo with a Next.js client and modular NestJS REST API backed by Prisma/PostgreSQL.

**Key Characteristics:**
- Nest modules group controller, service, DTO and guard code by feature; `apps/api/src/app.module.ts` composes them.
- Authentication is global; routes opt out with `@Public()`, while contest data routes additionally use `ContestGuard`.
- The active contest is a client-selected context sent as `X-Contest-Id`; server-side ownership is checked before feature services run.
- Web pages are client components that call the API through `apps/web/lib/api.ts`; transient simulation state is mirrored in local/session storage and persisted as server drafts.

## Layers

**Presentation:**
- Purpose: Render user flows and maintain browser state.
- Location: `apps/web/app/`, `apps/web/components/`
- Contains: App Router pages, shared shell, loading/error/report controls.
- Depends on: `apps/web/lib/api.ts`, `apps/web/lib/types.ts` and browser storage.
- Used by: Browser users.

**HTTP/API:**
- Purpose: Expose REST endpoints and validate/authorize requests.
- Location: `apps/api/src/*/*.controller.ts`, `apps/api/src/main.ts`
- Contains: Routes under `/api`, DTO binding and guards.
- Depends on: Feature services and request decorators.
- Used by: Web client.

**Application services:**
- Purpose: Implement domain operations and response shaping.
- Location: `apps/api/src/*/*.service.ts`, `apps/api/src/questions/scoring.ts`, `apps/api/src/questions/timing.ts`
- Contains: Contest-scoped queries, attempt lifecycle, scoring, timing and dashboard aggregation.
- Depends on: `PrismaService` and Prisma-generated enums/types.
- Used by: Controllers and feature guards.

**Persistence:**
- Purpose: Store relational state and bootstrap content.
- Location: `apps/api/prisma/schema.prisma`, `apps/api/src/prisma/prisma.service.ts`, `apps/api/prisma/seed.ts`
- Contains: Users/sessions, contests, exams/questions, attempts/answers, study topics/progress and sessions.
- Depends on: PostgreSQL via `DATABASE_URL`.
- Used by: All API services.

## Data Flow

### Primary Request Path

1. Browser loads `AppShell` and `AppProvider` (`apps/web/components/app-shell.tsx`, `apps/web/components/app-context.tsx`).
2. `apiFetch` calls `/api/auth/me` and `/api/contests`, carrying the HTTP-only session cookie (`apps/web/lib/api.ts`).
3. Nest `AuthGuard` resolves the session; contest routes run `ContestGuard`, which validates `X-Contest-Id` ownership (`apps/api/src/auth/auth.guard.ts`, `apps/api/src/contests/contest.guard.ts`).
4. Controller delegates to a feature service, which queries/mutates Prisma (`apps/api/src/questions/questions.controller.ts`, `apps/api/src/questions/questions.service.ts`).
5. JSON response updates page state; completed attempts and study progress are persisted in PostgreSQL.

### Simulation Flow

1. Setup page lists contest exams/disciplines/subjects and posts `StartAttemptDto` (`apps/web/app/simulado/page.tsx`, `apps/api/src/questions/questions.controller.ts`).
2. `QuestionsService.start` selects and orders questions, computes time limits and creates `Attempt` plus `AttemptQuestion` rows.
3. Active player loads `/simulations/:id`, tracks answers/times in React and local storage, and periodically PATCHes `/draft` (`apps/web/app/simulado/[id]/page.tsx`).
4. Submission posts answers; scoring/timing helpers calculate weighted results and the result page reads `/simulations/:id` (`apps/api/src/questions/scoring.ts`, `apps/api/src/questions/timing.ts`, `apps/web/app/resultados/[id]/page.tsx`).

**State Management:** React state and `AppContext` own browser UI/session context; local/session storage supports attempt recovery and preferences; durable domain state is Prisma/PostgreSQL.

## Key Abstractions

**Contest context:** `ContestGuard`, `CurrentContest` and `X-Contest-Id` scope dashboard, plans and simulations to an owned contest (`apps/api/src/contests/contest.guard.ts`, `apps/api/src/contests/current-contest.decorator.ts`).

**Attempt aggregate:** `Attempt`, `AttemptQuestion` and `AttemptAnswer` model ordered questions, drafts, answers, timing and scores (`apps/api/prisma/schema.prisma`).

**Feature module:** Each API feature follows Nest's module/controller/service/DTO arrangement, for example `apps/api/src/study-plan/study-plan.module.ts`.

## Entry Points

**API server:** `apps/api/src/main.ts`; starts Nest, configures `/api`, CORS, validation and port.

**Web application:** `apps/web/app/layout.tsx`; establishes metadata, fonts, global CSS and `AppShell`.

**Development orchestration:** Root `package.json` script `dev` concurrently starts API and web workspaces; `docker-compose.yml` supplies PostgreSQL.

## Architectural Constraints

- **Authentication:** Global `AuthGuard` protects endpoints; only explicitly decorated public routes bypass it (`apps/api/src/auth/auth.guard.ts`).
- **Tenant boundary:** Every contest-scoped service call must use the contest resolved by `ContestGuard`; do not trust a contest ID from the body alone.
- **Persistence:** Use `PrismaService` rather than constructing `PrismaClient` in feature code (`apps/api/src/prisma/prisma.service.ts`).
- **Browser/server split:** Next pages using hooks, storage or API calls are client components; `apps/web/app/layout.tsx` is the server-level wrapper.
- **Global mutable state:** App context and browser storage are the only notable client-wide state; no API in-memory domain store is present.

## Anti-Patterns

### Bypassing contest ownership

**What happens:** A feature accepts a contest identifier without `ContestGuard`/`findOwned` validation.
**Why it's wrong:** It can expose or mutate another user's attempts, topics or dashboard.
**Do this instead:** Apply `@UseGuards(ContestGuard)` and obtain the contest via `@CurrentContest()` as in `apps/api/src/questions/questions.controller.ts`.

### Coupling pages directly to persistence

**What happens:** Web code assumes database shape or performs domain calculations locally.
**Why it's wrong:** It duplicates API rules and weakens the server boundary.
**Do this instead:** Add a typed API endpoint/service method and consume it through `apps/web/lib/api.ts` and `apps/web/lib/types.ts`.

## Error Handling

**Strategy:** API services throw Nest HTTP exceptions; global `ValidationPipe` rejects unknown/invalid DTO fields; web `apiFetch` converts non-2xx responses to `ApiError` and pages render `ErrorState`.

**Patterns:** Use `NotFoundException`/`BadRequestException`/`ConflictException` in services; use `try/catch` around client transitions and provide retry UI (`apps/api/src/questions/questions.service.ts`, `apps/web/components/error-state.tsx`).

## Cross-Cutting Concerns

**Logging:** No dedicated logging abstraction detected; Nest/default console behavior is used.
**Validation:** `class-validator` DTOs with whitelist, transform and forbid-non-whitelisted settings in `apps/api/src/main.ts`.
**Authentication:** HTTP-only cookie sessions backed by hashed tokens in `AuthSession` (`apps/api/src/auth/auth.controller.ts`, `apps/api/src/auth/auth.service.ts`).

*Architecture analysis: 2026-08-26*
