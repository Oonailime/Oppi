# Technology Stack

**Analysis Date:** 2026-08-26

## Languages

**Primary:**
- TypeScript 5.9.3 - `apps/api/src/`, `apps/web/`, and Prisma seed/schema-adjacent code
- JavaScript (ES modules) - PDF/XLSX extraction and categorization automation in `scripts/` and `automacoes/`

**Secondary:**
- CSS - global web styling in `apps/web/app/globals.css`
- PowerShell and Windows batch - local launcher scripts in `scripts/start-estuda.ps1` and `Iniciar Estuda.cmd`
- Prisma schema DSL - relational model in `apps/api/prisma/schema.prisma`

## Runtime

**Environment:**
- Node.js >=22.0.0 - API, Next.js, extraction scripts, and local orchestration
- Browser runtime - React client components and API calls from `apps/web/`

**Package Manager:**
- npm - root workspaces and package scripts
- Lockfile: present (`package-lock.json`, lockfile version 3)

## Frameworks

**Core:**
- Next.js 16.2.12 - standalone-output web application in `apps/web/`
- React 19.2.8 / React DOM 19.2.8 - web UI and client state
- NestJS 11.1.28 with Express platform - HTTP API in `apps/api/`
- Prisma 6.19.3 - PostgreSQL client and schema/migrations in `apps/api/prisma/`

**Testing:**
- Jest 30.2.0 with ts-jest 29.4.6 - API unit/service tests in `apps/api/test/`
- `@nestjs/testing` 11.1.28 - Nest testing utilities

**Build/Dev:**
- SWC (`@swc/core` 1.15.8, `@swc/cli` 0.7.10) - API TypeScript compilation and watch mode, configured by `apps/api/.swcrc`
- Next.js build/dev server - web compilation and standalone production output
- ESLint 9.39.2 with TypeScript and Next configs - linting in `apps/api/eslint.config.mjs` and `apps/web/eslint.config.mjs`
- `concurrently` 10.0.4 - parallel API/web development processes
- Docker Compose - local PostgreSQL service in `docker-compose.yml`

## Key Dependencies

**Critical:**
- `@nestjs/config` 4.0.2 - global `.env` loading in `apps/api/src/app.module.ts`
- `@prisma/client` 6.19.3 - database access throughout API services
- `class-validator` 0.15.1 and `class-transformer` 0.5.1 - global DTO validation/transformation in `apps/api/src/main.ts`
- `react` / `next` - application UI and routing

**Infrastructure:**
- PostgreSQL 17 Alpine - containerized relational database declared in `docker-compose.yml`
- `@napi-rs/canvas` 1.0.2 - rasterizing PDF pages during source extraction
- `pdfjs-dist` 6.1.200 - PDF parsing in `scripts/extract-*.mjs`
- `xlsx` 0.18.5 - spreadsheet ingestion in `scripts/extract-source-data.mjs`
- `lucide-react` 1.27.0 - UI icons
- `@fontsource-variable/archivo` and `@fontsource-variable/newsreader` 5.3.0 - bundled fonts

## Configuration

**Environment:**
- Root `.env` exists and is ignored; do not commit or expose its values.
- API loads `../../.env` and local `.env` through `ConfigModule.forRoot` in `apps/api/src/app.module.ts`.
- Web reads the public API base URL in `apps/web/lib/api.ts`; local web configuration uses an ignored `.env.local`.
- Critical variable names are `DATABASE_URL`, `PORT`, `HOST`, `WEB_ORIGIN`, `NEXT_PUBLIC_API_URL`, `CONTEST_UPLOAD_ROOT`, and `QUESTION_REPORTS_FILE`.

**Build:**
- Root orchestration and workspace scripts: `package.json`
- Shared strict compiler settings: `tsconfig.base.json`
- API build settings: `apps/api/nest-cli.json`, `apps/api/.swcrc`, `apps/api/tsconfig*.json`
- Web standalone/allowed-origin settings: `apps/web/next.config.ts`, `apps/web/tsconfig.json`
- Database schema/client generation: `apps/api/prisma/schema.prisma`

## Platform Requirements

**Development:**
- Node.js 22+, npm, and Docker Desktop or Docker Engine with Compose; local ports are web 3000, API 3001, PostgreSQL host port 5433 (see `README.md` and `docker-compose.yml`).
- Source extraction additionally requires the checked-in PDF/XLSX inputs under `provas/`, `enem/`, and root data files.

**Production:**
- Node.js process for NestJS API and Next.js standalone server; PostgreSQL-compatible database configured through `DATABASE_URL`.
- The repository provides a PostgreSQL Compose deployment and Next standalone output, but no cloud hosting or CI deployment configuration is detected.

---

*Stack analysis: 2026-08-26*
