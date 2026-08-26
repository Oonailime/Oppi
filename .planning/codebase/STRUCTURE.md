# Codebase Structure

**Analysis Date:** 2026-08-26

## Directory Layout

```text
dataprev/
├── apps/
│   ├── api/                 # NestJS API, Prisma schema/data and tests
│   └── web/                 # Next.js App Router frontend
├── scripts/                 # Source extraction, categorization and startup utilities
├── automacoes/              # Domain-specific question categorization automation
├── provas/                  # Source exam PDFs grouped by exam
├── enem/                    # ENEM source PDFs grouped by year
├── uploads/                 # User/request upload area (currently sparse)
├── docker-compose.yml       # PostgreSQL development service
├── package.json             # Workspace scripts and shared tooling
└── README.md                # Setup, runtime and domain overview
```

## Directory Purposes

**`apps/api/`:** NestJS backend workspace. Feature folders under `apps/api/src/` contain modules, controllers, services, guards and DTOs. `apps/api/prisma/` contains schema, migrations, seed and imported question/topic JSON. `apps/api/test/` contains API unit/integration-style specs. `apps/api/dist/` is compiled output.

**`apps/web/`:** Next.js frontend workspace. Routes live under `apps/web/app/`; reusable UI under `apps/web/components/`; API/session/type helpers under `apps/web/lib/`; static question images under `apps/web/public/questions/`.

**`scripts/`:** Node ESM utilities that extract PDFs/source data, build study plans, categorize questions and launch local services. Keep ingestion/transformation scripts here rather than in runtime feature folders.

**`automacoes/`:** Standalone automation and generated reports for question categorization, including `automacoes/categorizar-questoes-dataprev.mjs`.

**`provas/` and `enem/`:** Source artifacts organized by exam slug or ENEM year. They are inputs to extraction scripts, not application runtime modules.

## Key File Locations

**Entry Points:**
- `apps/api/src/main.ts`: API bootstrap.
- `apps/web/app/layout.tsx`: Web root layout and shell.
- `apps/web/app/page.tsx`: Dashboard route.
- `package.json`: Workspace command entry points.

**Configuration:**
- `apps/api/src/app.module.ts`: API module composition and environment loading.
- `apps/api/prisma/schema.prisma`: Database model contract.
- `apps/api/nest-cli.json`, `apps/api/tsconfig.json`, `apps/web/next.config.ts`: Workspace build configuration.
- `docker-compose.yml`: Local PostgreSQL service.
- `.env` and `apps/api/.env` exist as environment configuration; their contents are not documented here.

**Core Logic:**
- `apps/api/src/questions/questions.service.ts`: Attempt lifecycle and question selection.
- `apps/api/src/questions/scoring.ts`, `apps/api/src/questions/timing.ts`: Pure scoring/timing rules.
- `apps/api/src/contests/contests.service.ts`: Contest ownership and assignments.
- `apps/api/src/study-plan/study-plan.service.ts`: Topic progress/catalog behavior.
- `apps/api/src/dashboard/dashboard.service.ts`: Aggregated dashboard metrics.
- `apps/web/components/app-context.tsx`: Browser session and selected-contest state.

**Testing:**
- `apps/api/test/*.spec.ts`: API tests by feature and pure helper.
- Frontend test files are not detected under `apps/web/`.

## Naming Conventions

**Files:**
- TypeScript modules use kebab-case feature names with role suffixes: `questions.service.ts`, `contest.guard.ts`, `update-study-topic.dto.ts`.
- Next routes use lowercase route directories and `page.tsx`; dynamic segments use bracket names such as `apps/web/app/resultados/[id]/page.tsx`.
- Source artifacts use descriptive slugs and year directories, e.g. `provas/stn2024/` and `enem/2025/`.

**Directories:**
- API directories are feature nouns (`auth`, `contests`, `questions`, `study-plan`).
- Web route directories mirror Portuguese product routes (`concursos`, `plano`, `simulado`, `resultados`).

## Where to Add New Code

**New Feature:**
- API module/controller/service/DTOs: create `apps/api/src/<feature>/` and register the module in `apps/api/src/app.module.ts`.
- Web route: add `apps/web/app/<route>/page.tsx`; share repeated UI in `apps/web/components/` and request/type definitions in `apps/web/lib/`.
- Tests: add API specs in `apps/api/test/<feature>.spec.ts`; frontend test location is not established.

**New Component/Module:**
- Nest module: `apps/api/src/<feature>/<feature>.module.ts` with matching controller/service.
- React component: `apps/web/components/<component-name>.tsx`; use `app-context.tsx` for cross-route app state.

**Utilities:**
- Domain-pure API helpers belong beside their feature, e.g. `apps/api/src/questions/scoring.ts`.
- Cross-cutting web helpers belong in `apps/web/lib/`; offline/source processing utilities belong in `scripts/`.

## Special Directories

**`apps/api/dist/` and `apps/web/.next/`:** Build/generated output; do not place source changes here. Regenerate with workspace build/dev commands.

**`apps/api/prisma/migrations/`:** Generated and committed database migration history. Add schema changes to `apps/api/prisma/schema.prisma` and create a migration through Prisma tooling.

**`apps/api/prisma/data/`:** Seed/import JSON consumed by `apps/api/prisma/seed.ts`; keep data transformations in `scripts/`.

**`apps/web/public/questions/`:** Committed static question/context imagery served by URL; add assets using the exam/question naming convention used by existing directories.

**`node_modules/`, `.next/`, `dist/`:** Generated or installed; not locations for handwritten code.

*Structure analysis: 2026-08-26*
