// tests/step-definitions/background.steps.ts
// ============================================================================
// Step definitions for the Background section — steps that run before every
// scenario to ensure the system is in a known, testable state.
// ============================================================================

import { Given } from '@cucumber/cucumber';
import { expect } from 'chai';
import { healthCheck } from '../support/api-client';
import { ActivityRankingWorld } from '../support/world';

// ---------------------------------------------------------------------------
// "Given the Activity Ranking API is available"
// ---------------------------------------------------------------------------
// We call the /health endpoint before every scenario. If the server is not
// running (and nock is not active), this will throw a clear error rather than
// letting scenarios fail with confusing network errors mid-test.
// ---------------------------------------------------------------------------
Given<ActivityRankingWorld>(
  'the Activity Ranking API is available',
  async function () {
    // In nock-intercepted mode this hits our stub and returns true immediately.
    // In real integration-test mode it pings the live server.
    const isAlive = await healthCheck();
    expect(isAlive, 'Activity Ranking API health check failed — is the server running?').to.be.true;
  }
);

// ---------------------------------------------------------------------------
// "And the Open-Meteo weather service is reachable"
// ---------------------------------------------------------------------------
// In unit-test mode, nock intercepts all outbound calls so this is a no-op
// assertion. In integration mode, this could ping Open-Meteo's health endpoint.
// We keep it here so the Gherkin reads naturally.
// ---------------------------------------------------------------------------
Given<ActivityRankingWorld>(
  'the Open-Meteo weather service is reachable',
  function () {
    // In the nock context all external calls are stubbed, so we just note
    // that this step passed. In a real integration suite, swap for an
    // axios.get to Open-Meteo's actual health check URL.
    this.weatherApiDown = false;
  }
);

// ---------------------------------------------------------------------------
// "Given today's date is known"
// ---------------------------------------------------------------------------
// A self-documenting step used in date-range validation scenarios.
// ---------------------------------------------------------------------------
Given<ActivityRankingWorld>(
  "today's date is known",
  function () {
    // Nothing to set up — we just use new Date() inline in the Then steps.
    // This step exists for readability in the .feature file.
  }
);
