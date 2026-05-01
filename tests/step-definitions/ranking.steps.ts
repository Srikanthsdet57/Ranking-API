// tests/step-definitions/ranking.steps.ts
// ============================================================================
// Step definitions for the core Activity Ranking API scenarios:
//   - Happy path
//   - Schema / contract validation
//   - Input validation & error handling
//   - Resilience (weather service down / timeout)
//   - Performance
// ============================================================================

import { Given, When, Then, DataTable } from '@cucumber/cucumber';
import { expect } from 'chai';
import { getRankings } from '../support/api-client';
import { ActivityRankingWorld } from '../support/world';
import { RankingResponse, ForecastDay, ActivityRanking } from '../mocks/mock-data';

// ============================================================================
// GIVEN steps — setting up preconditions / mocked weather state
// ============================================================================

Given<ActivityRankingWorld>(
  'I have a valid city name {string}',
  function (city: string) {
    // Simply store the city name; it will be used in the When step.
    this.lastCity = city;
  }
);

Given<ActivityRankingWorld>(
  'the weather forecast for {string} includes heavy snowfall on day {int}',
  function (city: string, _day: number) {
    // The actual snow conditions are baked into HOKKAIDO_RESPONSE in mock-data.
    // This step documents the precondition in human-readable terms.
    this.lastCity = city;
    this.mockedWeatherConditions = { snowfall: true, day: _day };
  }
);

Given<ActivityRankingWorld>(
  'the weather forecast for {string} shows clear skies and {int} degrees on day {int}',
  function (city: string, _temp: number, _day: number) {
    this.lastCity = city;
    this.mockedWeatherConditions = { clearSkies: true, tempC: _temp, day: _day };
  }
);

Given<ActivityRankingWorld>(
  'the weather forecast for {string} shows heavy rain on day {int}',
  function (city: string, _day: number) {
    this.lastCity = city;
    this.mockedWeatherConditions = { heavyRain: true, day: _day };
  }
);

Given<ActivityRankingWorld>(
  'the Open-Meteo weather API is down',
  function () {
    // The nock stub for Paris/Berlin already returns 503/504.
    // This step marks it explicitly so other steps can branch if needed.
    this.weatherApiDown = true;
  }
);

Given<ActivityRankingWorld>(
  'the Open-Meteo weather API has a response delay of {int} seconds',
  function (_delaySec: number) {
    // Nock stub for Berlin returns 504 — simulating the timeout.
    this.weatherApiDown = true;
  }
);

Given<ActivityRankingWorld>(
  'the activity ranking API timeout threshold is {int} seconds',
  function (_timeoutSec: number) {
    // Documented precondition — timeout is configured server-side.
  }
);

Given<ActivityRankingWorld>(
  'the Open-Meteo weather API is temporarily unavailable',
  function () {
    this.weatherApiDown = true;
  }
);

Given<ActivityRankingWorld>(
  'a valid cached response for {string} exists',
  function (city: string) {
    // The nock stub for Amsterdam returns { cached: true, ... }.
    this.lastCity = city;
  }
);

Given<ActivityRankingWorld>(
  'I have a city name that is {int} characters long',
  function (length: number) {
    // Generate a city name exactly `length` chars long
    this.lastCity = 'A'.repeat(length);
  }
);

// ============================================================================
// WHEN steps — making the API call
// ============================================================================

When<ActivityRankingWorld>(
  'I submit the city {string} to the activity ranking API',
  async function (city: string) {
    this.lastCity = city;
    this.requestStartTime = Date.now();
    this.lastResponse = await getRankings(city);
  }
);

When<ActivityRankingWorld>(
  'I submit an empty city name to the activity ranking API',
  async function () {
    this.lastCity = '';
    this.lastResponse = await getRankings('');
  }
);

When<ActivityRankingWorld>(
  'I submit that city name to the activity ranking API',
  async function () {
    // Uses the city name stored in a previous Given step
    this.lastResponse = await getRankings(this.lastCity);
  }
);

// ============================================================================
// THEN steps — assertions on status, schema, data, and performance
// ============================================================================

// --- Status code ---
Then<ActivityRankingWorld>(
  'the API response status should be {int}',
  function (expectedStatus: number) {
    expect(this.lastResponse).to.not.be.null;
    expect(this.lastResponse!.status).to.equal(
      expectedStatus,
      `Expected HTTP ${expectedStatus} but got ${this.lastResponse!.status}. Body: ${JSON.stringify(this.lastResponse!.body)}`
    );
  }
);

// --- 7-day forecast presence ---
Then<ActivityRankingWorld>(
  'the response should contain activity rankings for exactly {int} days',
  function (expectedDays: number) {
    const body = this.lastResponse!.body as RankingResponse;
    expect(body.forecast).to.be.an('array');
    expect(body.forecast).to.have.lengthOf(
      expectedDays,
      `Expected ${expectedDays} days in forecast but got ${body.forecast.length}`
    );
  }
);

// --- ISO 8601 date format ---
Then<ActivityRankingWorld>(
  'each day should include a {string} in ISO 8601 format',
  function (_fieldName: string) {
    const body = this.lastResponse!.body as RankingResponse;
    const iso8601Regex = /^\d{4}-\d{2}-\d{2}$/;
    body.forecast.forEach((day: ForecastDay, index: number) => {
      expect(day.date).to.match(
        iso8601Regex,
        `Day ${index + 1} date "${day.date}" is not in YYYY-MM-DD format`
      );
    });
  }
);

// --- All four required activities present ---
Then<ActivityRankingWorld>(
  'each day should include rankings for the following activities:',
  function (dataTable: DataTable) {
    const expectedActivities = dataTable.rows().map((row: string[]) => row[0]);
    const body = this.lastResponse!.body as RankingResponse;

    body.forecast.forEach((day: ForecastDay, dayIndex: number) => {
      const returnedActivityNames = day.activities.map((a: ActivityRanking) => a.name);
      expectedActivities.forEach((expected: string) => {
        expect(returnedActivityNames).to.include(
          expected,
          `Day ${dayIndex + 1} (${day.date}) is missing activity "${expected}"`
        );
      });
    });
  }
);

// --- Rank is 1–10 ---
Then<ActivityRankingWorld>(
  'each activity ranking should have a {string} value between {int} and {int}',
  function (_fieldName: string, min: number, max: number) {
    const body = this.lastResponse!.body as RankingResponse;
    body.forecast.forEach((day: ForecastDay) => {
      day.activities.forEach((activity: ActivityRanking) => {
        expect(activity.rank).to.be.at.least(
          min, `Activity "${activity.name}" on ${day.date} has rank ${activity.rank} which is below ${min}`
        );
        expect(activity.rank).to.be.at.most(
          max, `Activity "${activity.name}" on ${day.date} has rank ${activity.rank} which exceeds ${max}`
        );
      });
    });
  }
);

// --- Non-empty reasoning ---
Then<ActivityRankingWorld>(
  'each activity ranking should include a non-empty {string} string',
  function (_fieldName: string) {
    const body = this.lastResponse!.body as RankingResponse;
    body.forecast.forEach((day: ForecastDay) => {
      day.activities.forEach((activity: ActivityRanking) => {
        expect(activity.reasoning).to.be.a('string');
        expect(activity.reasoning.trim().length).to.be.greaterThan(
          0,
          `Activity "${activity.name}" on ${day.date} has an empty reasoning`
        );
      });
    });
  }
);

// --- Specific day / activity rank ---
Then<ActivityRankingWorld>(
  'the day {int} ranking for {string} should have a rank of {int} or above',
  function (dayNumber: number, activityName: string, minRank: number) {
    const body = this.lastResponse!.body as RankingResponse;
    const day = body.forecast[dayNumber - 1];
    expect(day, `Day ${dayNumber} not found in forecast`).to.not.be.undefined;

    const activity = day.activities.find((a: ActivityRanking) => a.name === activityName);
    expect(activity, `Activity "${activityName}" not found on day ${dayNumber}`).to.not.be.undefined;

    expect(activity!.rank).to.be.at.least(
      minRank,
      `Expected "${activityName}" rank on day ${dayNumber} to be >= ${minRank}, got ${activity!.rank}`
    );
  }
);

Then<ActivityRankingWorld>(
  'the day {int} ranking for {string} should be higher than {string}',
  function (dayNumber: number, betterActivity: string, worseActivity: string) {
    const body = this.lastResponse!.body as RankingResponse;
    const day = body.forecast[dayNumber - 1];

    const better = day.activities.find((a: ActivityRanking) => a.name === betterActivity);
    const worse  = day.activities.find((a: ActivityRanking) => a.name === worseActivity);

    expect(better, `"${betterActivity}" not found on day ${dayNumber}`).to.not.be.undefined;
    expect(worse,  `"${worseActivity}" not found on day ${dayNumber}`).to.not.be.undefined;

    expect(better!.rank).to.be.greaterThan(
      worse!.rank,
      `Expected "${betterActivity}" (rank ${better!.rank}) to be ranked higher than "${worseActivity}" (rank ${worse!.rank}) on day ${dayNumber}`
    );
  }
);

// --- Reasoning content checks ---
Then<ActivityRankingWorld>(
  'the day {int} {string} reasoning should mention snow-related conditions',
  function (dayNumber: number, activityName: string) {
    const body = this.lastResponse!.body as RankingResponse;
    const activity = body.forecast[dayNumber - 1].activities
      .find((a: ActivityRanking) => a.name === activityName);

    expect(activity).to.not.be.undefined;
    const snowTerms = ['snow', 'snowfall', 'blizzard', 'powder', 'frost'];
    const reasoning = activity!.reasoning.toLowerCase();
    const mentionsSnow = snowTerms.some(term => reasoning.includes(term));
    expect(mentionsSnow).to.be.true;
  }
);

Then<ActivityRankingWorld>(
  'the day {int} {string} reasoning should mention clear or warm conditions',
  function (dayNumber: number, activityName: string) {
    const body = this.lastResponse!.body as RankingResponse;
    const activity = body.forecast[dayNumber - 1].activities
      .find((a: ActivityRanking) => a.name === activityName);

    expect(activity).to.not.be.undefined;
    const warmTerms = ['clear', 'warm', 'sunny', 'sunshine', 'bright', '°c', 'perfect'];
    const reasoning = activity!.reasoning.toLowerCase();
    const mentionsWarm = warmTerms.some(term => reasoning.includes(term));
    expect(mentionsWarm).to.be.true;
  }
);

// ============================================================================
// Schema / Contract assertions
// ============================================================================

Then<ActivityRankingWorld>(
  'the response body should be valid JSON',
  function () {
    // If body is already an object, axios parsed it correctly.
    expect(this.lastResponse!.body).to.be.an('object');
    expect(this.lastResponse!.body).to.not.be.null;
  }
);

Then<ActivityRankingWorld>(
  'the response should contain a top-level {string} field equal to {string}',
  function (fieldName: string, expectedValue: string) {
    const body = this.lastResponse!.body as Record<string, unknown>;
    expect(body[fieldName]).to.equal(
      expectedValue,
      `Expected "${fieldName}" to be "${expectedValue}" but got "${body[fieldName]}"`
    );
  }
);

Then<ActivityRankingWorld>(
  'the response should contain a top-level {string} array of length {int}',
  function (fieldName: string, expectedLength: number) {
    const body = this.lastResponse!.body as Record<string, unknown>;
    expect(body[fieldName]).to.be.an('array');
    expect((body[fieldName] as unknown[]).length).to.equal(expectedLength);
  }
);

Then<ActivityRankingWorld>(
  'each forecast item should contain the fields: {string}',
  function (fieldsCsv: string) {
    const requiredFields = fieldsCsv.split(',').map((f: string) => f.trim().replace(/"/g, ''));
    const body = this.lastResponse!.body as RankingResponse;
    body.forecast.forEach((day: ForecastDay, i: number) => {
      requiredFields.forEach((field: string) => {
        expect(day).to.have.property(
          field,
          `Forecast item ${i} is missing required field "${field}"`
        );
      });
    });
  }
);

Then<ActivityRankingWorld>(
  'each activity item should contain the fields: {string}',
  function (fieldsCsv: string) {
    const requiredFields = fieldsCsv.split(',').map((f: string) => f.trim().replace(/"/g, ''));
    const body = this.lastResponse!.body as RankingResponse;
    body.forecast.forEach((day: ForecastDay, dayIndex: number) => {
      day.activities.forEach((activity: ActivityRanking, actIndex: number) => {
        requiredFields.forEach((field: string) => {
          expect(activity).to.have.property(
            field,
            `Day ${dayIndex + 1}, activity ${actIndex} is missing field "${field}"`
          );
        });
      });
    });
  }
);

Then<ActivityRankingWorld>(
  'every {string} field in the response should be an integer',
  function (_fieldName: string) {
    const body = this.lastResponse!.body as RankingResponse;
    body.forecast.forEach((day: ForecastDay) => {
      day.activities.forEach((activity: ActivityRanking) => {
        expect(Number.isInteger(activity.rank)).to.be.true;
      });
    });
  }
);

Then<ActivityRankingWorld>(
  'every {string} field should be greater than or equal to {int}',
  function (_fieldName: string, min: number) {
    const body = this.lastResponse!.body as RankingResponse;
    body.forecast.forEach((day: ForecastDay) => {
      day.activities.forEach((a: ActivityRanking) => {
        expect(a.rank).to.be.at.least(min);
      });
    });
  }
);

Then<ActivityRankingWorld>(
  'every {string} field should be less than or equal to {int}',
  function (_fieldName: string, max: number) {
    const body = this.lastResponse!.body as RankingResponse;
    body.forecast.forEach((day: ForecastDay) => {
      day.activities.forEach((a: ActivityRanking) => {
        expect(a.rank).to.be.at.most(max);
      });
    });
  }
);

// --- Date range assertions ---
Then<ActivityRankingWorld>(
  "the first forecast date should be tomorrow's date",
  function () {
    const body = this.lastResponse!.body as RankingResponse;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const expectedDate = tomorrow.toISOString().split('T')[0];
    expect(body.forecast[0].date).to.equal(
      expectedDate,
      `Expected first date to be ${expectedDate} but got ${body.forecast[0].date}`
    );
  }
);

Then<ActivityRankingWorld>(
  'the last forecast date should be {int} days from today',
  function (daysAhead: number) {
    const body = this.lastResponse!.body as RankingResponse;
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + daysAhead);
    const expectedDate = targetDate.toISOString().split('T')[0];
    const lastDate = body.forecast[body.forecast.length - 1].date;
    expect(lastDate).to.equal(
      expectedDate,
      `Expected last date to be ${expectedDate} but got ${lastDate}`
    );
  }
);

Then<ActivityRankingWorld>(
  'there should be no duplicate dates in the forecast',
  function () {
    const body = this.lastResponse!.body as RankingResponse;
    const dates = body.forecast.map((d: ForecastDay) => d.date);
    const uniqueDates = new Set(dates);
    expect(uniqueDates.size).to.equal(
      dates.length,
      `Found duplicate dates in forecast: ${dates.join(', ')}`
    );
  }
);

// ============================================================================
// Error handling assertions
// ============================================================================

Then<ActivityRankingWorld>(
  'the error message should indicate that {string} is required',
  function (_field: string) {
    const body = this.lastResponse!.body as Record<string, string>;
    const message = (body.message || body.error || '').toLowerCase();
    const indicatesRequired =
      message.includes('required') ||
      message.includes('cannot be empty') ||
      message.includes('missing');
    expect(indicatesRequired).to.be.true;
  }
);

Then<ActivityRankingWorld>(
  'the error message should indicate the city was not found',
  function () {
    const body = this.lastResponse!.body as Record<string, string>;
    const message = (body.message || body.error || '').toLowerCase();
    expect(message).to.satisfy(
      (msg: string) => msg.includes('not found') || msg.includes('could not be found'),
      `Expected "not found" in error message but got: "${message}"`
    );
  }
);

Then<ActivityRankingWorld>(
  'the error message should indicate invalid input',
  function () {
    const body = this.lastResponse!.body as Record<string, string>;
    const message = (body.message || body.error || '').toLowerCase();
    expect(message).to.satisfy(
      (msg: string) =>
        msg.includes('invalid') || msg.includes('disallowed') || msg.includes('not allowed'),
      `Expected "invalid input" in error message but got: "${message}"`
    );
  }
);

Then<ActivityRankingWorld>(
  'the error message should indicate the input exceeds the maximum allowed length',
  function () {
    const body = this.lastResponse!.body as Record<string, string>;
    const message = (body.message || body.error || '').toLowerCase();
    expect(message).to.satisfy(
      (msg: string) =>
        msg.includes('exceeds') || msg.includes('too long') || msg.includes('maximum'),
      `Expected "maximum length" in error message but got: "${message}"`
    );
  }
);

Then<ActivityRankingWorld>(
  'the error message should indicate invalid city name format',
  function () {
    const body = this.lastResponse!.body as Record<string, string>;
    const message = (body.message || body.error || '').toLowerCase();
    expect(message).to.include('invalid');
  }
);

Then<ActivityRankingWorld>(
  'the error message should indicate a temporary service unavailability',
  function () {
    const body = this.lastResponse!.body as Record<string, string>;
    const message = (body.message || body.error || '').toLowerCase();
    expect(message).to.satisfy(
      (msg: string) =>
        msg.includes('unavailable') || msg.includes('temporarily') || msg.includes('try again'),
      `Expected "service unavailable" in error message but got: "${message}"`
    );
  }
);

Then<ActivityRankingWorld>(
  'the error should NOT expose internal stack traces',
  function () {
    const body = this.lastResponse!.body as Record<string, unknown>;
    // Stack traces typically contain "at Object." or "Error:" patterns
    const bodyStr = JSON.stringify(body);
    expect(bodyStr).to.not.match(
      /at Object\.|at Function\.|\.js:\d+:\d+/,
      'Response body appears to contain a stack trace'
    );
    expect(body).to.not.have.property('stack');
    expect(body).to.not.have.property('trace');
  }
);

Then<ActivityRankingWorld>(
  'the error message should indicate a gateway timeout',
  function () {
    const body = this.lastResponse!.body as Record<string, string>;
    const message = (body.message || body.error || '').toLowerCase();
    expect(message).to.satisfy(
      (msg: string) => msg.includes('timeout') || msg.includes('timed out'),
      `Expected "timeout" in error message but got: "${message}"`
    );
  }
);

// --- Cached response ---
Then<ActivityRankingWorld>(
  'the response should include a {string}: true flag',
  function (flagName: string) {
    const body = this.lastResponse!.body as Record<string, unknown>;
    expect(body[flagName]).to.equal(true);
  }
);

// ============================================================================
// Performance assertions
// ============================================================================

Then<ActivityRankingWorld>(
  'the API should respond within {int} milliseconds',
  function (maxMs: number) {
    expect(this.lastResponse).to.not.be.null;
    expect(this.lastResponse!.durationMs).to.be.lessThan(
      maxMs,
      `API took ${this.lastResponse!.durationMs}ms — exceeds ${maxMs}ms threshold`
    );
  }
);
