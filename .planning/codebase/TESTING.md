# Testing Patterns

**Analysis Date:** 2026-08-26

## Test Framework

**Runner:**
- Jest 30.2.0 with `ts-jest` 29.4.6, configured inline in `apps/api/package.json`.
- `testRegex` is `test/.*\\.spec\\.ts$`, `rootDir` is `apps/api`, and tests use the Node environment.

**Assertion Library:**
- Jest's built-in `expect` assertions (`toEqual`, `toMatchObject`, `toThrow`, `rejects`, `toHaveBeenCalledWith`, and related matchers).

**Run Commands:**
```bash
npm test                         # Run API tests from the repository root
npm test --workspace @dataprev/api # Run API Jest suite directly
npm run lint                     # Lint API and web workspaces
```

Coverage is not configured in `apps/api/package.json`; no coverage threshold or coverage script is detected.

## Test File Organization

**Location:**
- API tests live in the separate `apps/api/test/` directory rather than beside source files. The current suite covers auth/passwords, contests, dashboard aggregation, question reports, questions, and scoring/timing.
- No frontend test directory or frontend test files are detected under `apps/web/`.

**Naming:**
- Use `<subject>.spec.ts`, for example `apps/api/test/auth.spec.ts`, `apps/api/test/questions.service.spec.ts`, and `apps/api/test/scoring.spec.ts`.
- Use `describe` names matching the function/class under test and Portuguese `it` descriptions that state the business behavior.

**Structure:**
```text
apps/api/test/
├── auth.spec.ts
├── contests.controller.spec.ts
├── contests.service.spec.ts
├── dashboard.service.spec.ts
├── question-reports.service.spec.ts
├── questions.service.spec.ts
└── scoring.spec.ts
```

## Test Structure

**Suite Organization:**
```typescript
describe("calculateAttemptScore", () => {
  it("aplica os pesos de conhecimentos gerais e específicos", () => {
    const score = calculateAttemptScore(
      [
        { id: 1, weight: 1, correctAnswer: "A", annulled: false },
        { id: 41, weight: 2.5, correctAnswer: "C", annulled: false },
      ],
      new Map([
        [1, "A"],
        [41, "B"],
      ]),
    );

    expect(score.correctAnswers).toBe(1);
    expect(score.weightedScore).toBe(1);
  });
});
```

**Patterns:**
- Prefer deterministic unit tests for pure calculations and service methods. Use one behavior-focused `it` per business rule and assert both primary values and important edge-case fields.
- Use `async` tests with `await` for service calls, and `await expect(promise).rejects...` for rejected operations, as in `apps/api/test/contests.service.spec.ts`.
- Use `toMatchObject` when the result contains incidental fields (dates, IDs, or larger API payloads), and `toEqual` when the complete shape/order is part of the contract.
- Keep test fixtures near the top of the test file (`cebraspeExam`, `contestInput`, `documents`) and use small factory helpers such as `pdf()` and `enemDayQuestions()` for repeated data.

## Mocking

**Framework:** Jest mocks and spies (`jest.fn()`, `.mockResolvedValue()`, `.mockResolvedValueOnce()`, and `.toHaveBeenCalledWith()`).

**Patterns:**
```typescript
const prisma = {
  exam: { count: jest.fn().mockResolvedValue(2) },
  contest: { create: jest.fn() },
} as unknown as PrismaService;

await new ContestsService(prisma).create(userId, contestInput, documents);

expect(prisma.exam.count).toHaveBeenCalledWith({
  where: { id: { in: ["dataprev-2024", "enem-2025"] }, systemManaged: true },
});
```

**What to Mock:**
- Mock Prisma model methods and `$transaction` callbacks at the service boundary, preserving only the methods each test exercises. Capture arguments in an async `jest.fn` when persistence payloads must be inspected, as in `apps/api/test/contests.service.spec.ts`.
- Mock filesystem/environment boundaries with temporary directories and test-specific environment variables in `apps/api/test/question-reports.service.spec.ts` and `apps/api/test/contests.service.spec.ts`.

**What NOT to Mock:**
- Keep pure scoring, timing, parsing, and serialization helpers real; `apps/api/test/scoring.spec.ts` calls them directly.
- Do not mock the function under test or assert implementation-only calls when an observable result or persisted payload can be checked.

## Fixtures and Factories

**Test Data:**
```typescript
function pdf(originalname: string) {
  const buffer = Buffer.from("%PDF-1.7\\narquivo de teste");
  return {
    originalname,
    mimetype: "application/pdf",
    size: buffer.length,
    buffer,
  };
}
```

- Use plain object fixtures typed narrowly where needed (`ContestCreateCall`) and cast the minimal mock object to the dependency type (`as unknown as PrismaService`).
- Use fixed ISO dates for time aggregation tests, as in `apps/api/test/dashboard.service.spec.ts`, to avoid clock-dependent assertions.

**Location:**
- There is no shared fixture/factory directory; fixtures are local to each `apps/api/test/*.spec.ts` file.
- Integration-like filesystem tests create isolated paths below `/tmp` and clean them in `afterEach`/`afterAll`.

## Coverage

**Requirements:** No enforced target is detected. The suite is broadest around `apps/api/src/questions/questions.service.ts` (the 1,340-line `apps/api/test/questions.service.spec.ts`) and pure scoring/timing; web UI and controller request wiring have limited or no coverage.

**View Coverage:**
```bash
# No repository coverage command is configured.
# If needed, invoke Jest's standard one-off coverage flag in the API workspace:
npm test --workspace @dataprev/api -- --coverage
```

## Test Types

**Unit Tests:**
- Primary test type. Pure domain functions in `apps/api/src/questions/scoring.ts`, `apps/api/src/questions/timing.ts`, and `apps/api/src/dashboard/dashboard.service.ts` are tested with deterministic inputs.
- Nest services are instantiated directly with hand-built Prisma mocks instead of a full `TestingModule`, notably in `apps/api/test/questions.service.spec.ts` and `apps/api/test/contests.service.spec.ts`.

**Integration Tests:**
- Limited boundary tests exercise real temporary filesystem writes and JSON reads in `apps/api/test/contests.service.spec.ts` and `apps/api/test/question-reports.service.spec.ts`, while Prisma remains mocked.

**E2E Tests:**
- Not used. No HTTP server, browser runner, or E2E configuration is detected.

## Common Patterns

**Async Testing:**
```typescript
await expect(
  new ContestsService(prisma).create(userId, contestInput, incompleteDocuments),
).rejects.toThrow("Envie o PDF de gabarito correspondente.");
```

**Error Testing:**
- Assert Nest exception classes for type-level behavior (`toBeInstanceOf(BadRequestException)` or `toThrow(ServiceUnavailableException)`) and assert the Portuguese message when the user-facing contract matters.
- Cover invalid input, empty/blank answers, annulled questions, unavailable resources, and authorization-related branches with explicit tests; these cases are represented in `apps/api/test/questions.service.spec.ts`, `apps/api/test/contests.service.spec.ts`, and `apps/api/test/scoring.spec.ts`.

---

*Testing analysis: 2026-08-26*
