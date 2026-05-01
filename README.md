# Activity Ranking API — Test Suite

## Overview

This repository contains the full QA deliverable for the **Activity Ranking API** feature, which accepts a city name, fetches a 7-day weather forecast from Open-Meteo, and returns a ranked list of activities (Skiing, Surfing, Outdoor Sightseeing, Indoor Sightseeing) with contextual reasoning.

The suite covers:

| Deliverable | File |
|-------------|------|
| BDD scenarios (Gherkin) | `bdd-scenarios.feature` |
| Automated tests (Cucumber + TypeScript) | `tests/` |
| Manual test script | `manual-test-script.md` |

---

## Repository Structure

```
activity-ranking-tests/
├── bdd-scenarios.feature           ← All Gherkin scenarios
├── manual-test-script.md           ← Step-by-step manual QA guide
├── README.md                       ← This file
└── tests/
    ├── package.json                ← Dependencies & npm scripts
    ├── tsconfig.json               ← TypeScript compiler settings
    ├── cucumber.js                 ← Cucumber runner config
    ├── mocks/
    │   └── mock-data.ts            ← All test fixtures and city response stubs
    ├── step-definitions/
    │   ├── background.steps.ts     ← Background Given steps
    │   ├── ranking.steps.ts        ← Ranking API When/Then steps
    │   └── autocomplete.steps.ts  ← Autocomplete When/Then steps
    └── support/
        ├── world.ts                ← Cucumber World (shared scenario state)
        ├── hooks.ts                ← Before/After hooks + nock setup
        └── api-client.ts          ← Axios HTTP wrapper
```

---

## Running the Tests

### 1. Install dependencies

```bash
cd tests
npm install
```

### 2. Run all tests

```bash
npm test
```

### 3. Run by tag

```bash
npm run test:smoke           # Critical happy-path only
npm run test:contract        # Schema/contract tests
npm run test:autocomplete    # Autocomplete tests
npm run test:error-handling  # Input validation
npm run test:resilience      # Weather API failure scenarios
npm run test:performance     # Timing assertions
```

### 4. Run with HTML report

```bash
npm run test:report
# Opens reports/cucumber-report.html
```

### 5. Run against a live server (integration mode)

```bash
API_BASE_URL=https://staging.yourdomain.com npm test
```

> By default, all tests run against `http://localhost:3000` and all HTTP calls are **intercepted by nock** (no real network traffic). This makes the suite fast, deterministic, and CI-safe.

---

## Test Design Decisions

### Why Cucumber + TypeScript?
The ticket asked for BDD tests in JavaScript or TypeScript with Cucumber. TypeScript was chosen over plain JavaScript because type-checking on the API response shapes (`RankingResponse`, `ForecastDay`, `ActivityRanking`) catches contract regressions at compile time, not just at runtime.

### Why nock for HTTP mocking?
- **Speed:** No real HTTP calls means tests run in milliseconds.
- **Determinism:** Weather data changes daily. Without mocking, a test asserting "Skiing rank ≥ 8 in Hokkaido on day 1" would fail the moment Open-Meteo returns warmer weather.
- **Offline CI:** Tests pass on CI agents with no internet access.
- **Resilience scenarios:** You cannot reliably cause `api.open-meteo.com` to return 503 in a real test — nock makes this trivial.

The trade-off is that nock bypasses real network behaviour (DNS resolution, TLS handshake, HTTP redirects). A separate integration test suite run on a schedule (e.g. nightly) against the real Open-Meteo API would complement these unit-style tests.

### Why a shared World object instead of global variables?
Cucumber creates a fresh `World` instance per scenario. This eliminates the most common source of flaky tests: shared mutable state leaking between scenarios.

### Why a thin `api-client.ts` wrapper?
- Centralises the base URL and timeout configuration
- Normalises Axios's error-on-4xx behaviour — our step definitions always receive a resolved `ApiResponse` and can assert on status codes without `try/catch` noise
- Captures `durationMs` automatically, making performance assertions a one-liner

### Tag strategy
| Tag | Purpose |
|-----|---------|
| `@smoke` | Run in < 30 seconds before every deployment |
| `@happy-path` | Full positive-path coverage |
| `@contract` | API schema/contract — run on every PR |
| `@autocomplete` | All search-suggestion scenarios |
| `@error-handling` | Input validation and 4xx responses |
| `@resilience` | Simulated external failures |
| `@performance` | Timing assertions — may be skipped in slow CI |
| `@mocked` | Tests that require specific mock conditions (excluded from integration runs) |

---

## How AI Assisted This Work

I used AI as a support tool to review and compare my work, which helped me gain insights and apply meaningful improvements.

---

## Omissions & Trade-offs

| Item | Decision | Reason |
|------|----------|--------|
| **Browser E2E tests** | Omitted | Playwright/Cypress would test the full UI. Scope: API-layer BDD tests only. In a real project I would add E2E for TC-05, TC-08, TC-18. |
| **Real Open-Meteo integration tests** | Omitted | Would require a live server. Recommended as a nightly job against staging. |
| **Authentication** | Not in scope | Ticket does not mention auth. If added, tests for 401/403 would be required. |
| **Concurrency / load testing** | Omitted | Out of scope for a BDD test suite. Artillery or k6 would be the right tool. |
| **Negative schema tests** | Partially covered | I test for missing fields in the happy path but don't exhaustively test every combination of missing fields (combinatorial explosion). |
| **Caching scenario** | Stubbed | The cached-response scenario is tested at the response-body level. Cache invalidation logic would need more granular unit tests closer to the implementation. |
| **Accessibility (autocomplete)** | Omitted | ARIA attributes, keyboard navigation, and screen-reader compatibility are important for autocomplete but require a browser context. |


