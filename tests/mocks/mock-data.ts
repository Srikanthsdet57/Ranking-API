// tests/mocks/mock-data.ts
// ============================================================================
// Central store of all test fixtures used across step definitions.
//
// WHY CENTRALISE MOCKS?
//   - Single source of truth: if the schema changes, update one file
//   - Step definitions stay clean — no inline JSON blobs
//   - Easy to add new city stubs without touching test logic
// ============================================================================

/**
 * Represents one activity's ranking entry for a single day.
 */
export interface ActivityRanking {
  name: string;
  rank: number;
  reasoning: string;
}

/**
 * Represents one day in the 7-day forecast response.
 */
export interface ForecastDay {
  date: string;         // ISO 8601, e.g. "2026-05-02"
  activities: ActivityRanking[];
}

/**
 * The full API response body returned by GET /api/rankings?city=...
 */
export interface RankingResponse {
  city: string;
  forecast: ForecastDay[];
  cached?: boolean;     // present only when serving stale cached data
}

// ============================================================================
// Helper: generates a 7-day ISO date array starting from tomorrow
// ============================================================================
export function generateNext7Days(): string[] {
  const dates: string[] = [];
  for (let i = 1; i <= 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    dates.push(d.toISOString().split('T')[0]);
  }
  return dates;
}

// ============================================================================
// Default activity set for a "neutral" weather day
// (used when no special weather conditions are specified)
// ============================================================================
function neutralDayActivities(): ActivityRanking[] {
  return [
    { name: 'Skiing',              rank: 3, reasoning: 'No snow expected, low suitability' },
    { name: 'Surfing',             rank: 5, reasoning: 'Moderate waves, partly cloudy' },
    { name: 'Outdoor Sightseeing', rank: 6, reasoning: 'Mild temperatures, some cloud cover' },
    { name: 'Indoor Sightseeing',  rank: 7, reasoning: 'Good fallback option for mixed weather' }
  ];
}

// ============================================================================
// CAPE TOWN – neutral weather mock
// ============================================================================
export const CAPE_TOWN_RESPONSE: RankingResponse = {
  city: 'Cape Town',
  forecast: generateNext7Days().map((date) => ({
    date,
    activities: neutralDayActivities()
  }))
};

// ============================================================================
// SYDNEY – used for schema validation tests
// ============================================================================
export const SYDNEY_RESPONSE: RankingResponse = {
  city: 'Sydney',
  forecast: generateNext7Days().map((date) => ({
    date,
    activities: [
      { name: 'Skiing',              rank: 1, reasoning: 'No snow in Sydney; not suitable' },
      { name: 'Surfing',             rank: 9, reasoning: 'Excellent 2m waves and offshore winds' },
      { name: 'Outdoor Sightseeing', rank: 8, reasoning: 'Clear skies and 24°C forecast' },
      { name: 'Indoor Sightseeing',  rank: 5, reasoning: 'Good option but outdoors preferred' }
    ]
  }))
};

// ============================================================================
// TOKYO – used for rank/integer validation tests
// ============================================================================
export const TOKYO_RESPONSE: RankingResponse = {
  city: 'Tokyo',
  forecast: generateNext7Days().map((date) => ({
    date,
    activities: [
      { name: 'Skiing',              rank: 2, reasoning: 'Minimal snow in city; head to mountains' },
      { name: 'Surfing',             rank: 1, reasoning: 'Not coastal — no surfing' },
      { name: 'Outdoor Sightseeing', rank: 8, reasoning: 'Warm spring weather, cherry blossoms' },
      { name: 'Indoor Sightseeing',  rank: 7, reasoning: 'World-class museums and galleries' }
    ]
  }))
};

// ============================================================================
// NEW YORK – used for date-range validation tests
// ============================================================================
export const NEW_YORK_RESPONSE: RankingResponse = {
  city: 'New York',
  forecast: generateNext7Days().map((date) => ({
    date,
    activities: neutralDayActivities()
  }))
};

// ============================================================================
// ZURICH – used for performance tests
// ============================================================================
export const ZURICH_RESPONSE: RankingResponse = {
  city: 'Zurich',
  forecast: generateNext7Days().map((date) => ({
    date,
    activities: neutralDayActivities()
  }))
};

// ============================================================================
// HOKKAIDO – high snowfall day 1 (Skiing should rank 8+)
// ============================================================================
export const HOKKAIDO_RESPONSE: RankingResponse = {
  city: 'Hokkaido',
  forecast: generateNext7Days().map((date, index) => {
    if (index === 0) {
      // Day 1: heavy snowfall
      return {
        date,
        activities: [
          { name: 'Skiing',              rank: 9, reasoning: 'Heavy snowfall expected — ideal skiing conditions' },
          { name: 'Surfing',             rank: 1, reasoning: 'Landlocked region — not applicable' },
          { name: 'Outdoor Sightseeing', rank: 4, reasoning: 'Snow reduces visibility and walkability' },
          { name: 'Indoor Sightseeing',  rank: 7, reasoning: 'Good alternative during heavy snowfall' }
        ]
      };
    }
    return { date, activities: neutralDayActivities() };
  })
};

// ============================================================================
// BARCELONA – clear skies + 22°C day 1 (Outdoor Sightseeing should rank 7+)
// ============================================================================
export const BARCELONA_RESPONSE: RankingResponse = {
  city: 'Barcelona',
  forecast: generateNext7Days().map((date, index) => {
    if (index === 0) {
      return {
        date,
        activities: [
          { name: 'Skiing',              rank: 1, reasoning: 'No snow — not suitable' },
          { name: 'Surfing',             rank: 6, reasoning: 'Moderate Mediterranean swell' },
          { name: 'Outdoor Sightseeing', rank: 9, reasoning: 'Clear skies and a warm 22°C — perfect for exploring' },
          { name: 'Indoor Sightseeing',  rank: 5, reasoning: 'Outdoor weather is excellent — go outside!' }
        ]
      };
    }
    return { date, activities: neutralDayActivities() };
  })
};

// ============================================================================
// LONDON – heavy rain on day 3 (Indoor > Outdoor on that day)
// ============================================================================
export const LONDON_RESPONSE: RankingResponse = {
  city: 'London',
  forecast: generateNext7Days().map((date, index) => {
    if (index === 2) {
      // Day 3 (index 2): heavy rain
      return {
        date,
        activities: [
          { name: 'Skiing',              rank: 1, reasoning: 'No ski resorts in central London' },
          { name: 'Surfing',             rank: 2, reasoning: 'River not suitable for surfing' },
          { name: 'Outdoor Sightseeing', rank: 3, reasoning: 'Heavy rain makes outdoor touring unpleasant' },
          { name: 'Indoor Sightseeing',  rank: 8, reasoning: 'Heavy rain — perfect day for the British Museum' }
        ]
      };
    }
    return { date, activities: neutralDayActivities() };
  })
};

// ============================================================================
// JOHANNESBURG – for autocomplete selection test
// ============================================================================
export const JOHANNESBURG_RESPONSE: RankingResponse = {
  city: 'Johannesburg',
  forecast: generateNext7Days().map((date) => ({
    date,
    activities: neutralDayActivities()
  }))
};

// ============================================================================
// AMSTERDAM – for cached response test
// ============================================================================
export const AMSTERDAM_CACHED_RESPONSE: RankingResponse = {
  city: 'Amsterdam',
  cached: true,
  forecast: generateNext7Days().map((date) => ({
    date,
    activities: neutralDayActivities()
  }))
};

// ============================================================================
// AUTOCOMPLETE MOCK DATA
// A static list simulating what a city search endpoint might return.
// ============================================================================
export const CITY_SUGGESTIONS: Record<string, string[]> = {
  'cape':        ['Cape Town', 'Cape Breton', 'Cape Coral', 'Cape Fear'],
  'cape town':   ['Cape Town'],
  'lo':          ['London', 'Los Angeles', 'Lome', 'Lodz'],
  'lon':         ['London', 'Long Beach'],
  'lond':        ['London'],
  'londo':       ['London'],
  'london':      ['London'],
  'new':         ['New York', 'New Orleans', 'Newcastle', 'New Delhi', 'Newport'],
  'new york':    ['New York'],
  'san':         ['San Francisco', 'San Diego', 'San Jose', 'Santiago', 'Santa Fe', 'Santa Monica', 'Sandton', 'San Antonio', 'San Sebastian', 'Santa Cruz'],
  'johan':       ['Johannesburg'],
  'johannesburg':['Johannesburg'],
  'cape town':   ['Cape Town'],
  'dur':         ['Durban', 'Durham'],
  'paris':       ['Paris'],
  'l':           [],   // Single char — should return nothing
  'xyzqwerty':   []    // Unrecognised — should return nothing
};

/**
 * Simulates the autocomplete lookup.
 * In real implementation this would hit /api/search/suggestions?q=...
 */
export function getSuggestions(query: string): string[] {
  const key = query.toLowerCase().trim();
  // Return exact match first, then prefix match
  if (CITY_SUGGESTIONS[key] !== undefined) {
    return CITY_SUGGESTIONS[key];
  }
  // Fallback: find any key that starts with the query
  const results: string[] = [];
  for (const [k, v] of Object.entries(CITY_SUGGESTIONS)) {
    if (k.startsWith(key) && v.length > 0) {
      results.push(...v);
    }
  }
  // Deduplicate
  return [...new Set(results)];
}

// ============================================================================
// ERROR RESPONSE FIXTURES
// ============================================================================
export const ERROR_RESPONSES = {
  emptyCity: {
    status: 400,
    body: { error: 'Validation error', message: '"city" parameter is required and cannot be empty' }
  },
  invalidCity: {
    status: 400,
    body: { error: 'Validation error', message: 'Invalid city name format. City names must contain only letters, spaces, and hyphens.' }
  },
  cityNotFound: {
    status: 404,
    body: { error: 'Not found', message: 'City "ZzzzInvalidCityXxx123" could not be found. Please check the spelling and try again.' }
  },
  sqlInjection: {
    status: 400,
    body: { error: 'Validation error', message: 'Invalid input: city name contains disallowed characters' }
  },
  tooLong: {
    status: 400,
    body: { error: 'Validation error', message: 'City name exceeds the maximum allowed length of 100 characters' }
  },
  weatherServiceDown: {
    status: 503,
    body: { error: 'Service unavailable', message: 'The weather forecast service is temporarily unavailable. Please try again later.' }
  },
  gatewayTimeout: {
    status: 504,
    body: { error: 'Gateway timeout', message: 'The weather service did not respond in time. Please try again.' }
  }
};
