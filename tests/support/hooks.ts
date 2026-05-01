// tests/support/hooks.ts
// ============================================================================
// Cucumber lifecycle hooks — Before / After / BeforeAll / AfterAll.
//
// BEFORE EACH SCENARIO:
//   - Activate nock to intercept all outbound HTTP (no real network calls)
//   - Set up default happy-path stubs so tests that don't override them work
//
// AFTER EACH SCENARIO:
//   - Restore all nock interceptors (prevents interceptors leaking between tests)
//   - Log the scenario name + status for easier debugging
//
// WHY NOCK?
//   Nock intercepts Node's http module so Axios calls never hit a real server.
//   This means tests are:
//     (a) fast — no network round-trips
//     (b) deterministic — responses are exactly what we define
//     (c) offline-safe — tests pass in CI with no internet access
// ============================================================================

import { Before, After, BeforeAll, AfterAll, ITestCaseHookParameter } from '@cucumber/cucumber';
import nock from 'nock';
import {
  CAPE_TOWN_RESPONSE,
  SYDNEY_RESPONSE,
  TOKYO_RESPONSE,
  NEW_YORK_RESPONSE,
  ZURICH_RESPONSE,
  HOKKAIDO_RESPONSE,
  BARCELONA_RESPONSE,
  LONDON_RESPONSE,
  JOHANNESBURG_RESPONSE,
  AMSTERDAM_CACHED_RESPONSE,
  ERROR_RESPONSES
} from '../mocks/mock-data';

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

// ---------------------------------------------------------------------------
// BeforeAll: activate nock globally — disable all real HTTP traffic.
// Any HTTP call not matched by a nock interceptor will throw an error,
// which helps catch accidental real-API calls in tests.
// ---------------------------------------------------------------------------
BeforeAll(function () {
  nock.disableNetConnect();
  // Allow localhost connections for any future integration test mode
  nock.enableNetConnect('127.0.0.1');
});

// ---------------------------------------------------------------------------
// AfterAll: restore nock so other test suites (if any) are unaffected.
// ---------------------------------------------------------------------------
AfterAll(function () {
  nock.cleanAll();
  nock.enableNetConnect();
});

// ---------------------------------------------------------------------------
// Before each scenario: register all default HTTP intercept stubs.
// Using `nock.persist()` means the stub can be called multiple times;
// without it, nock stubs are consumed after one use.
// ---------------------------------------------------------------------------
Before(function () {
  // Health check stub — used in Background steps
  nock(BASE_URL).persist().get('/health').reply(200, { status: 'ok' });

  // --- Rankings endpoint stubs (POST /api/rankings) ---
  nock(BASE_URL).persist()
    .post('/api/rankings', { city: 'Cape Town' })
    .reply(200, CAPE_TOWN_RESPONSE);

  nock(BASE_URL).persist()
    .post('/api/rankings', { city: 'Sydney' })
    .reply(200, SYDNEY_RESPONSE);

  nock(BASE_URL).persist()
    .post('/api/rankings', { city: 'Tokyo' })
    .reply(200, TOKYO_RESPONSE);

  nock(BASE_URL).persist()
    .post('/api/rankings', { city: 'New York' })
    .reply(200, NEW_YORK_RESPONSE);

  nock(BASE_URL).persist()
    .post('/api/rankings', { city: 'Zurich' })
    .reply(200, ZURICH_RESPONSE);

  nock(BASE_URL).persist()
    .post('/api/rankings', { city: 'Hokkaido' })
    .reply(200, HOKKAIDO_RESPONSE);

  nock(BASE_URL).persist()
    .post('/api/rankings', { city: 'Barcelona' })
    .reply(200, BARCELONA_RESPONSE);

  nock(BASE_URL).persist()
    .post('/api/rankings', { city: 'London' })
    .reply(200, LONDON_RESPONSE);

  nock(BASE_URL).persist()
    .post('/api/rankings', { city: 'Johannesburg' })
    .reply(200, JOHANNESBURG_RESPONSE);

  // Error stubs
  nock(BASE_URL).persist()
    .post('/api/rankings', { city: '' })
    .reply(400, ERROR_RESPONSES.emptyCity.body);

  nock(BASE_URL).persist()
    .post('/api/rankings', { city: '     ' })
    .reply(400, ERROR_RESPONSES.emptyCity.body);

  nock(BASE_URL).persist()
    .post('/api/rankings', { city: 'ZzzzInvalidCityXxx123' })
    .reply(404, ERROR_RESPONSES.cityNotFound.body);

  nock(BASE_URL).persist()
    .post('/api/rankings', { city: "'; DROP TABLE cities;--" })
    .reply(400, ERROR_RESPONSES.sqlInjection.body);

  nock(BASE_URL).persist()
    .post('/api/rankings', { city: '12345' })
    .reply(400, ERROR_RESPONSES.invalidCity.body);

  // Whitespace-only — regex match
  nock(BASE_URL).persist()
    .post('/api/rankings', /^\s+$/)
    .reply(400, ERROR_RESPONSES.emptyCity.body);

  // Weather service down — Paris
  nock(BASE_URL).persist()
    .post('/api/rankings', { city: 'Paris' })
    .reply(503, ERROR_RESPONSES.weatherServiceDown.body);

  // Gateway timeout — Berlin
  nock(BASE_URL).persist()
    .post('/api/rankings', { city: 'Berlin' })
    .reply(504, ERROR_RESPONSES.gatewayTimeout.body);

  // Cached response — Amsterdam
  nock(BASE_URL).persist()
    .post('/api/rankings', { city: 'Amsterdam' })
    .reply(200, AMSTERDAM_CACHED_RESPONSE);

  // --- Autocomplete endpoint stubs (GET /api/search/suggestions) ---
  nock(BASE_URL).persist()
    .get('/api/search/suggestions').query({ q: 'Cape' })
    .reply(200, ['Cape Town', 'Cape Breton', 'Cape Coral']);

  nock(BASE_URL).persist()
    .get('/api/search/suggestions').query({ q: 'Lo' })
    .reply(200, ['London', 'Los Angeles', 'Lome']);

  nock(BASE_URL).persist()
    .get('/api/search/suggestions').query({ q: 'caPE tOwN' })
    .reply(200, ['Cape Town']);

  nock(BASE_URL).persist()
    .get('/api/search/suggestions').query({ q: 'Johan' })
    .reply(200, ['Johannesburg']);

  nock(BASE_URL).persist()
    .get('/api/search/suggestions').query({ q: 'San' })
    .reply(200, [
      'San Francisco', 'San Diego', 'San Jose', 'Santiago',
      'Santa Fe', 'Santa Monica', 'Sandton', 'San Antonio',
      'San Sebastian', 'Santa Cruz'
    ]);

  nock(BASE_URL).persist()
    .get('/api/search/suggestions').query({ q: 'Xyzqwerty' })
    .reply(200, []);

  nock(BASE_URL).persist()
    .get('/api/search/suggestions').query({ q: 'Paris' })
    .reply(200, ['Paris']);

  nock(BASE_URL).persist()
    .get('/api/search/suggestions').query({ q: 'Dur' })
    .reply(200, ['Durban', 'Durham']);
});

// ---------------------------------------------------------------------------
// After each scenario: clean interceptors and log outcome
// ---------------------------------------------------------------------------
After(function (scenario: ITestCaseHookParameter) {
  nock.cleanAll();
  const status = scenario.result?.status;
  const name = scenario.pickle.name;
  if (status === 'FAILED') {
    console.error(`  ✗ FAILED: ${name}`);
  }
});
