// tests/support/api-client.ts
// ============================================================================
// Thin HTTP client wrapper around the Activity Ranking API and the
// Autocomplete Suggestions API.
//
// WHY A WRAPPER?
//   - Centralises base URL and headers — change in one place
//   - Returns a normalised ApiResponse object that includes timing data,
//     making performance assertions straightforward
//   - Swallows Axios error-on-non-2xx behaviour and always resolves,
//     letting our step definitions assert on status codes cleanly
// ============================================================================

import axios, { AxiosResponse, AxiosError } from 'axios';

// ---------------------------------------------------------------------------
// Configuration — override via environment variables in CI
// ---------------------------------------------------------------------------
const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const DEFAULT_TIMEOUT_MS = parseInt(process.env.API_TIMEOUT_MS || '10000', 10);

// ---------------------------------------------------------------------------
// Normalised response shape used throughout the test suite
// ---------------------------------------------------------------------------
export interface ApiResponse<T = unknown> {
  status: number;
  body: T;
  headers: Record<string, string>;
  durationMs: number; // used in performance assertions
}

// ---------------------------------------------------------------------------
// Internal helper: wraps axios calls so HTTP errors (4xx, 5xx) resolve as
// ApiResponse objects rather than thrown exceptions. This lets step defs
// assert cleanly on 400, 404, 503 without try/catch noise everywhere.
// ---------------------------------------------------------------------------
async function safeRequest<T>(
  requestFn: () => Promise<AxiosResponse<T>>
): Promise<ApiResponse<T>> {
  const startTime = Date.now();
  try {
    const response = await requestFn();
    return {
      status: response.status,
      body: response.data,
      headers: response.headers as Record<string, string>,
      durationMs: Date.now() - startTime
    };
  } catch (err) {
    const axiosErr = err as AxiosError<T>;
    if (axiosErr.response) {
      return {
        status: axiosErr.response.status,
        body: axiosErr.response.data,
        headers: axiosErr.response.headers as Record<string, string>,
        durationMs: Date.now() - startTime
      };
    }
    throw new Error(
      `Network error: ${axiosErr.message}. Is the server running at ${BASE_URL}?`
    );
  }
}

export async function getRankings(city: string): Promise<ApiResponse> {
  return safeRequest(() =>
    axios.post(
      `${BASE_URL}/api/rankings`,
      { city },
      { timeout: DEFAULT_TIMEOUT_MS, headers: { 'Content-Type': 'application/json' } }
    )
  );
}

export async function getSuggestionsApi(query: string): Promise<ApiResponse<string[]>> {
  return safeRequest(() =>
    axios.get<string[]>(`${BASE_URL}/api/search/suggestions`, {
      params: { q: query },
      timeout: 3000
    })
  );
}

export async function healthCheck(): Promise<boolean> {
  try {
    const res = await axios.get(`${BASE_URL}/health`, { timeout: 3000 });
    return res.status === 200;
  } catch {
    return false;
  }
}
