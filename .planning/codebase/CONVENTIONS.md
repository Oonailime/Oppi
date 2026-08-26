# Coding Conventions

**Analysis Date:** 2026-08-26

## Naming Patterns

**Files:**
- Use lowercase kebab-free names for TypeScript modules, with Nest feature directories and descriptive suffixes such as `auth.service.ts`, `questions.controller.ts`, and `report-question.dto.ts` under `apps/api/src/`.
- Use Next App Router route directories and `page.tsx` for screens under `apps/web/app/`; shared React components use lowercase kebab-free names such as `app-shell.tsx` and `question-report.tsx` under `apps/web/components/`.
- Tests are colocated in the API test directory as `<subject>.spec.ts`, for example `apps/api/test/questions.service.spec.ts` and `apps/api/test/scoring.spec.ts`.

**Functions:**
- Use camelCase for functions and methods (`calculateAttemptScore`, `listDisciplines`, `toggleStudyTimer`). Keep small pure helpers at module scope when they support a service or page (`formatDuration`, `parseDraftAnswers`).
- Use Nest lifecycle and handler names that describe the operation (`login`, `logout`, `list`, `create`, `update`, `submit`).

**Variables:**
- Use camelCase for locals and state (`contestId`, `selectedIssue`, `timerPending`). Use descriptive booleans with `is`, `has`, or `should` semantics (`isCorrect`, `hasLanguageVariants`, `timerRunning`).
- Use `UPPER_SNAKE_CASE` for module constants (`SESSION_DURATION_MS`, `SESSION_COOKIE`, `DATAPREV_CONTEST_ID`).

**Types:**
- Use PascalCase for classes, interfaces, and type aliases (`AuthService`, `AuthenticatedUser`, `ContestCreateCall`).
- Prefer domain unions and interfaces for API/UI contracts, with frontend contracts centralized in `apps/web/lib/types.ts` and backend DTOs in feature `dto/` directories.
- Use Prisma-generated enums (`ContestType`, `AttemptMode`) at backend boundaries rather than duplicating string literals.

## Code Style

**Formatting:**
- No repository Prettier configuration is present. Match the existing TypeScript formatting: double quotes, semicolons, trailing commas in multiline calls/objects, two-space indentation, and parenthesized multiline parameters.
- Keep imports at the top and use `import type` for type-only imports, as in `apps/api/src/auth/auth.service.ts` and `apps/web/app/page.tsx`.
- TypeScript is strict with `noUncheckedIndexedAccess`, `noImplicitOverride`, and `forceConsistentCasingInFileNames` in `tsconfig.base.json`; preserve explicit narrowing and non-null handling when adding code.

**Linting:**
- API linting uses ESLint 9 with `@eslint/js` and `typescript-eslint` recommended type-checked rules in `apps/api/eslint.config.mjs`. It covers `src/**/*.ts` and `test/**/*.ts`, ignores `dist/**` and `prisma/seed.ts`, and disables only `@typescript-eslint/no-misused-promises` and `@typescript-eslint/require-await`.
- Web linting uses `eslint-config-next` Core Web Vitals and TypeScript presets in `apps/web/eslint.config.mjs`; `.next/**` and `next-env.d.ts` are ignored, and `@next/next/no-img-element` is intentionally disabled.
- Run `npm run lint` from the repository root, or the workspace-specific lint scripts in `apps/api/package.json` and `apps/web/package.json`.

## Import Organization

**Order:**
1. Framework and external packages (`@nestjs/common`, `react`, `lucide-react`, `node:*`).
2. Relative application modules and feature files.
3. Type-only imports are placed with their logical module group and explicitly marked with `import type`.

**Path Aliases:**
- Frontend code uses the `@/` alias for `apps/web` imports, such as `@/lib/api`, `@/components/error-state`, and `@/lib/types`.
- API code uses relative imports between feature modules (for example `../prisma/prisma.service`); no API alias is detected.

## Error Handling

**Patterns:**
- Nest services/controllers throw framework HTTP exceptions with Portuguese user-facing messages (`BadRequestException`, `NotFoundException`, `UnauthorizedException`, `ConflictException`) as seen in `apps/api/src/questions/questions.service.ts`, `apps/api/src/auth/auth.service.ts`, and `apps/api/src/contests/contests.controller.ts`.
- Frontend fetch failures are normalized into `ApiError` with an HTTP status in `apps/web/lib/api.ts`; components catch `unknown` and expose `reason instanceof Error ? reason.message : <fallback>` to the UI.
- Validate inputs through `class-validator` DTOs in feature `dto/` files and use explicit runtime narrowing when reading Prisma JSON or external request data, as in `parseDraftAnswers` in `apps/api/src/questions/questions.service.ts`.
- Return `null` for expected unauthenticated/optional states where the surrounding contract permits it (for example `AuthService.authenticate`), rather than throwing.

## Logging

**Framework:** console / Nest default logging; no dedicated logging package or structured logger is detected.

**Patterns:**
- Business services generally return data or throw exceptions and do not log routine operations. Keep this behavior for normal request paths.
- Add logging only for actionable operational failures, avoiding credentials, tokens, or user-sensitive payloads.

## Comments

**When to Comment:**
- Prefer self-explanatory names and short pure helpers. Existing production TypeScript has few inline comments; domain behavior is encoded in helper names and branches (for example ENEM timing logic in `apps/api/src/questions/questions.service.ts`).
- Add comments only for non-obvious business rules, compatibility behavior, or data migrations; do not narrate straightforward code.

**JSDoc/TSDoc:**
- No consistent JSDoc/TSDoc convention is detected. Public Nest handlers and exported helpers are documented by types and names rather than docblocks.

## Function Design

**Size:** Keep controller handlers thin and delegate persistence/business rules to injectable services. Pure calculations belong in focused modules such as `apps/api/src/questions/scoring.ts` and `apps/api/src/questions/timing.ts`.

**Parameters:** Prefer typed DTOs for request bodies and explicit IDs/user context for service methods. Use object parameters when a method has several optional filters, as in `StudyPlanService` and question attempt methods.

**Return Values:** Return serializable objects shaped for the API/UI. Use `Promise<T>` for asynchronous Prisma/file operations, and use explicit nullable fields (`null`) where the UI needs to distinguish unavailable data from zero.

## Module Design

**Exports:** Nest features export one primary injectable service/controller plus supporting types/helpers as needed. Frontend pages default-export their route component; shared components and API helpers use named exports.

**Barrel Files:** No barrel/index export files are detected. Import directly from the owning module path.

---

*Convention analysis: 2026-08-26*
