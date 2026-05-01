// tests/support/world.ts
// ============================================================================
// The Cucumber "World" is a fresh object created for EACH scenario.
// It acts as the shared state bag that step definitions read and write to.
//
// WHY USE WORLD?
//   - Avoids global variables (which leak state between scenarios)
//   - Keeps step definitions stateless — they only manipulate `this`
//   - Makes parallel test execution safe in future
// ============================================================================

import { setWorldConstructor, World, IWorldOptions } from '@cucumber/cucumber';
import { ApiResponse } from './api-client';

export interface ActivityRankingWorld extends World {
  lastResponse: ApiResponse | null;
  lastCity: string;
  lastSuggestions: string[];
  suggestionsVisible: boolean;
  searchBoxValue: string;
  rankingRequestTriggered: boolean;
  rankingRequestCity: string;
  mockedWeatherConditions: Record<string, unknown> | null;
  weatherApiDown: boolean;
  requestStartTime: number;
  autocompleteQuery: string;
  autocompleteCallCount: number;
}

class CustomWorld extends World implements ActivityRankingWorld {
  lastResponse: ApiResponse | null = null;
  lastCity = '';
  lastSuggestions: string[] = [];
  suggestionsVisible = false;
  searchBoxValue = '';
  rankingRequestTriggered = false;
  rankingRequestCity = '';
  mockedWeatherConditions: Record<string, unknown> | null = null;
  weatherApiDown = false;
  requestStartTime = 0;
  autocompleteQuery = '';
  autocompleteCallCount = 0;

  constructor(options: IWorldOptions) {
    super(options);
  }
}

setWorldConstructor(CustomWorld);
