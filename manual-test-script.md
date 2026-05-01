# Manual Test Script
## Activity Ranking API – City-Based Weather Forecast Integration with Search Suggestions

**Version:** 1.0  
**Date:** 2026-05-01  
**Tester:** Srikanth Akuthota  
**Environment:** Staging / Local dev server  

---

## Table of Contents
1. [Preconditions](#preconditions)
2. [Test Environment Setup](#test-environment-setup)
3. [Test Cases](#test-cases)
   - [TC-01 Happy Path: Valid City, Full 7-Day Ranking](#tc-01)
   - [TC-02 Response Schema Validation](#tc-02)
   - [TC-03 Rank Range Validation](#tc-03)
   - [TC-04 Reasoning Quality Check](#tc-04)
   - [TC-05 Autocomplete – Partial Match](#tc-05)
   - [TC-06 Autocomplete – Minimum Character Trigger](#tc-06)
   - [TC-07 Autocomplete – Case Insensitivity](#tc-07)
   - [TC-08 Autocomplete – Suggestion Selection Triggers Ranking](#tc-08)
   - [TC-09 Empty City Input](#tc-09)
   - [TC-10 Whitespace-Only City Input](#tc-10)
   - [TC-11 Non-Existent City](#tc-11)
   - [TC-12 Special Characters / Injection Attack](#tc-12)
   - [TC-13 Excessively Long City Name](#tc-13)
   - [TC-14 Numeric-Only City Name](#tc-14)
   - [TC-15 Weather API Unavailable (Resilience)](#tc-15)
   - [TC-16 Slow Weather API Response (Timeout)](#tc-16)
   - [TC-17 No Autocomplete Results Found](#tc-17)
   - [TC-18 Autocomplete Dismissed on Clear](#tc-18)
   - [TC-19 Performance – Ranking API Response Time](#tc-19)
   - [TC-20 Performance – Autocomplete Response Time](#tc-20)
4. [Edge Cases Summary](#edge-cases-summary)
5. [Bug Reporting Guidance](#bug-reporting-guidance)

---

## Preconditions

Before running any test case, confirm ALL of the following:

| # | Precondition | How to Verify |
|---|---|---|
| P1 | The Activity Ranking API server is running | `curl http://localhost:3000/health` → expect `{"status":"ok"}` |
| P2 | The Open-Meteo API is accessible from the server | `curl "https://api.open-meteo.com/v1/forecast?latitude=51.5&longitude=-0.1&daily=temperature_2m_max"` → expect 200 |
| P3 | A REST API client is ready (Postman, Insomnia, or curl) | Open Postman, confirm it launches |
| P4 | The UI search page is accessible (if testing autocomplete via UI) | Navigate to `http://localhost:3000` in Chrome/Firefox |
| P5 | Browser DevTools Network tab is accessible | Press F12 → Network tab |
| P6 | You have a test result log template ready | Copy the blank result row at the start of each test |

---

## Test Environment Setup

```
Base URL:          http://localhost:3000
Ranking endpoint:  POST /api/rankings
Suggestions endpoint: GET /api/search/suggestions?q={query}
Health endpoint:   GET /health
Content-Type:      application/json
```

**Postman collection import** (if available):  
Import `activity-ranking.postman_collection.json` from the `/docs` folder.

---

## Test Cases

---

### TC-01
### Happy Path: Valid City, Full 7-Day Ranking

**Priority:** Critical  
**Tags:** @smoke @happy-path  

#### Preconditions
- All global preconditions (P1–P3) met.

#### Test Steps

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open Postman. Create a POST request to `http://localhost:3000/api/rankings` | Request is configured, no errors shown |
| 2 | Set the request body to: `{ "city": "Cape Town" }` with Content-Type `application/json` | Body field shows the JSON payload |
| 3 | Click **Send** | Response is received |
| 4 | Check the HTTP status code in the response panel | Status is **200 OK** |
| 5 | Inspect the JSON body — look for a `forecast` array | `forecast` is an array |
| 6 | Count the number of items in the `forecast` array | Exactly **7 items** are present |
| 7 | Open the first item in `forecast` | Item has a `date` field and an `activities` array |
| 8 | Confirm the `date` format matches YYYY-MM-DD (e.g. `2026-05-02`) | Date is in ISO 8601 format |
| 9 | Confirm the `activities` array contains exactly 4 items | Activities: Skiing, Surfing, Outdoor Sightseeing, Indoor Sightseeing |
| 10 | For each activity, check the `rank` field | `rank` is a number between **1** and **10** (inclusive) |
| 11 | For each activity, check the `reasoning` field | `reasoning` is a non-empty string describing weather suitability |
| 12 | Repeat steps 7–11 for all 7 days | All days follow the same structure |

#### Expected Result
- HTTP 200
- `forecast` array with exactly 7 entries
- Each entry: `{ date, activities: [{ name, rank, reasoning }] }`
- All 4 activities present every day
- All ranks are integers from 1–10
- All reasoning strings are non-empty

#### Pass / Fail: ___________  Notes: ___________________________________

---

### TC-02
### Response Schema Validation

**Priority:** High  
**Tags:** @contract @schema  

#### Test Steps

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Send POST `/api/rankings` with `{ "city": "Sydney" }` | 200 response |
| 2 | Check the top-level response — it should have a `city` field | `city` equals `"Sydney"` |
| 3 | Check the top-level response — it should have a `forecast` field | `forecast` is an array |
| 4 | Open the `forecast` array — confirm it has 7 items | 7 items |
| 5 | Open any forecast item — confirm it has `date` and `activities` fields | Both fields present |
| 6 | Open any activity — confirm it has `name`, `rank`, and `reasoning` | All 3 fields present |
| 7 | Confirm no unexpected extra fields are present (e.g. no `_id`, `__v`) | Response is clean |

#### Pass / Fail: ___________  Notes: ___________________________________

---

### TC-03
### Rank Range Validation

**Priority:** High  
**Tags:** @contract  

#### Test Steps

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Send POST `/api/rankings` with `{ "city": "Tokyo" }` | 200 response |
| 2 | For every activity in every day, write down the `rank` value | All ranks are integers |
| 3 | Confirm no rank is 0 or negative | Min rank is 1 |
| 4 | Confirm no rank exceeds 10 | Max rank is 10 |
| 5 | Confirm no rank is a decimal (e.g. 7.5) | All ranks are whole numbers |

#### Pass / Fail: ___________  Notes: ___________________________________

---

### TC-04
### Reasoning Quality Check

**Priority:** Medium  
**Tags:** @happy-path  

**Goal:** Confirm that the reasoning text is contextually relevant to the weather, not a generic placeholder.

#### Test Steps

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Send POST `/api/rankings` with a snowy city (e.g. `{ "city": "Hokkaido" }`) | 200 response |
| 2 | Find day 1 in the forecast | Day 1 entry found |
| 3 | Find the `Skiing` activity on day 1 | Activity found |
| 4 | Read the `reasoning` text | It mentions snow, snowfall, powder, or similar winter terms |
| 5 | Check that the Skiing `rank` is notably higher than on a city with no snow (e.g. London) | Rank is 7 or higher for snowy day |
| 6 | Now send POST with a warm coastal city: `{ "city": "Barcelona" }` | 200 response |
| 7 | Find day 1 `Outdoor Sightseeing` reasoning | Mentions "clear", "warm", temperature, or sunshine |
| 8 | Confirm the rank for Outdoor Sightseeing is high | Rank 7 or above |

#### Pass / Fail: ___________  Notes: ___________________________________

---

### TC-05
### Autocomplete – Partial Match Returns Suggestions

**Priority:** Critical  
**Tags:** @autocomplete @happy-path  

#### Test Steps

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open the app UI at `http://localhost:3000` in the browser | Page loads with a search box |
| 2 | Click on the city search input field | Cursor appears in the field |
| 3 | Type "Cap" (3 characters) slowly, one character at a time | After the 2nd character, a dropdown appears below the search box |
| 4 | Observe the dropdown after typing "Cap" | Suggestions include "Cape Town" and other Cape-prefixed cities |
| 5 | Check that every visible suggestion contains the text "Cap" | All suggestions match the prefix |
| 6 | In Postman, send GET `/api/search/suggestions?q=Cape` | Response body is a JSON array containing "Cape Town" |

#### Pass / Fail: ___________  Notes: ___________________________________

---

### TC-06
### Autocomplete – Minimum 2 Characters Required

**Priority:** Medium  
**Tags:** @autocomplete  

#### Test Steps

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open the search page | Search box is empty |
| 2 | Type a single letter: "L" | No dropdown appears |
| 3 | Open Browser DevTools → Network tab | No request to `/api/search/suggestions` was made |
| 4 | Now type a second letter: "Lo" | Dropdown now appears with suggestions |
| 5 | Confirm a network request was made for "Lo" | Request visible in Network tab |

**Why this matters:** Calling the suggestions API on every single keystroke is expensive and produces poor UX with too-broad results.

#### Pass / Fail: ___________  Notes: ___________________________________

---

### TC-07
### Autocomplete – Case Insensitivity

**Priority:** Medium  
**Tags:** @autocomplete  

#### Test Steps

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | In the search box, type "cAPE tOWN" (mixed case) | Dropdown appears |
| 2 | Observe the suggestions | "Cape Town" appears in the list despite the mixed-case input |
| 3 | Send GET `/api/search/suggestions?q=cAPE+tOWN` in Postman | Array includes "Cape Town" |

#### Pass / Fail: ___________  Notes: ___________________________________

---

### TC-08
### Autocomplete – Selecting a Suggestion Triggers Ranking

**Priority:** Critical  
**Tags:** @autocomplete @happy-path  

#### Test Steps

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open the search page | Page loaded |
| 2 | Type "Johan" in the search box | Dropdown shows "Johannesburg" |
| 3 | Open DevTools → Network tab (clear existing requests) | Network tab is open and empty |
| 4 | Click on "Johannesburg" in the dropdown | Dropdown closes. Search box shows "Johannesburg" |
| 5 | Check the Network tab | A POST request to `/api/rankings` was made with body `{ "city": "Johannesburg" }` |
| 6 | Check the UI | Activity rankings for Johannesburg are displayed on screen |
| 7 | Confirm 7 days of rankings are shown | All 7 days visible |

#### Pass / Fail: ___________  Notes: ___________________________________

---

### TC-09
### Empty City Input — Validation Error

**Priority:** High  
**Tags:** @error-handling @validation  

#### Test Steps

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Send POST `/api/rankings` with body `{ "city": "" }` | Server responds |
| 2 | Check the HTTP status code | **400 Bad Request** |
| 3 | Read the error body | JSON object with `error` and `message` fields |
| 4 | Read the `message` | Contains "required", "cannot be empty", or similar |
| 5 | Confirm the response does NOT contain any stack trace | No `stack`, `trace`, or line-number patterns in the body |

#### Pass / Fail: ___________  Notes: ___________________________________

---

### TC-10
### Whitespace-Only City Input

**Priority:** Medium  
**Tags:** @error-handling @validation  

#### Test Steps

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Send POST `/api/rankings` with body `{ "city": "     " }` (5 spaces) | Server responds |
| 2 | Check the HTTP status code | **400 Bad Request** |
| 3 | Confirm the error message is the same as TC-09 | Whitespace treated same as empty |

#### Pass / Fail: ___________  Notes: ___________________________________

---

### TC-11
### Non-Existent City — 404 Not Found

**Priority:** High  
**Tags:** @error-handling @validation  

#### Test Steps

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Send POST `/api/rankings` with `{ "city": "ZzzzFakeCityXxx999" }` | Server responds |
| 2 | Check the HTTP status code | **404 Not Found** |
| 3 | Read the error message | Contains "not found" or "could not be found" |
| 4 | Confirm the response is still valid JSON | Parseable JSON object, not an HTML error page |

#### Pass / Fail: ___________  Notes: ___________________________________

---

### TC-12
### Special Characters / SQL Injection Attempt

**Priority:** High  
**Tags:** @error-handling @validation  

#### Test Steps

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Send POST `/api/rankings` with `{ "city": "'; DROP TABLE cities;--" }` | Server responds safely |
| 2 | Check the HTTP status code | **400 Bad Request** |
| 3 | Confirm the error message mentions invalid input or disallowed characters | Security-safe error message |
| 4 | Confirm the server did NOT crash (send a valid request after) | Server still responds to `{ "city": "London" }` with 200 |
| 5 | Try `{ "city": "<script>alert(1)</script>" }` | 400 Bad Request |
| 6 | Try `{ "city": "../../etc/passwd" }` | 400 Bad Request |

#### Pass / Fail: ___________  Notes: ___________________________________

---

### TC-13
### Excessively Long City Name

**Priority:** Medium  
**Tags:** @error-handling @validation  

#### Test Steps

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Generate a string of 300 "A" characters | Ready to paste |
| 2 | Send POST `/api/rankings` with `{ "city": "AAA...AAA" }` (300 chars) | Server responds |
| 3 | Check the HTTP status code | **400 Bad Request** |
| 4 | Read the error message | Contains "exceeds", "too long", or "maximum" |

#### Pass / Fail: ___________  Notes: ___________________________________

---

### TC-14
### Numeric-Only City Name

**Priority:** Medium  
**Tags:** @error-handling @validation  

#### Test Steps

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Send POST `/api/rankings` with `{ "city": "12345" }` | Server responds |
| 2 | Check the HTTP status code | **400 Bad Request** |
| 3 | Read the error message | Contains "invalid" |

#### Pass / Fail: ___________  Notes: ___________________________________

---

### TC-15
### Weather API Unavailable — Graceful Degradation

**Priority:** High  
**Tags:** @resilience  

#### Preconditions
- You have the ability to block/simulate an outage (e.g. use a proxy like Charles Proxy, or ask a dev to set `WEATHER_API_ENABLED=false` in the server config).

#### Test Steps

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Simulate the Open-Meteo API being down (block traffic to `api.open-meteo.com`) | External API is inaccessible |
| 2 | Send POST `/api/rankings` with `{ "city": "Paris" }` | Server responds |
| 3 | Check the HTTP status code | **503 Service Unavailable** |
| 4 | Read the error message | "temporarily unavailable" or "try again later" — user-friendly language |
| 5 | Confirm no internal details leaked | No stack traces, file paths, or database names in the response |
| 6 | Re-enable the weather API | Connectivity restored |
| 7 | Re-send the Paris request | 200 OK with rankings returned |

#### Pass / Fail: ___________  Notes: ___________________________________

---

### TC-16
### Slow Weather API — Timeout Handling

**Priority:** Medium  
**Tags:** @resilience  

#### Test Steps

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Using a network throttling tool (e.g. Charles Proxy with a 10-second delay), slow down responses from `api.open-meteo.com` | Delay active |
| 2 | Send POST `/api/rankings` with `{ "city": "Berlin" }` | Wait for response |
| 3 | Check the HTTP status code | **504 Gateway Timeout** |
| 4 | Read the error message | Contains "timeout" or "timed out" |
| 5 | Confirm the server responded before the client timeout | API returned 504 — did not hang indefinitely |

#### Pass / Fail: ___________  Notes: ___________________________________

---

### TC-17
### Autocomplete – No Results Found

**Priority:** Medium  
**Tags:** @autocomplete @edge-case  

#### Test Steps

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | In the search box, type "Xyzqwerty" | Dropdown appears (or is empty) |
| 2 | Observe the dropdown | Shows a "No results found" message, OR the dropdown is completely hidden |
| 3 | Send GET `/api/search/suggestions?q=Xyzqwerty` in Postman | Response is `[]` (empty array) with HTTP 200 |
| 4 | Confirm the UI does not crash or show a spinner indefinitely | Page remains responsive |

**Note:** An empty-array 200 response is preferred over 404 here, because "no suggestions" is a valid state, not an error.

#### Pass / Fail: ___________  Notes: ___________________________________

---

### TC-18
### Autocomplete Dismissed When Search Box Cleared

**Priority:** Medium  
**Tags:** @autocomplete @edge-case  

#### Test Steps

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Type "Paris" in the search box | Suggestions visible |
| 2 | Triple-click the search box to select all text | All text selected |
| 3 | Press Delete/Backspace to clear the field | Field is empty |
| 4 | Observe the dropdown | Dropdown is hidden / dismissed |
| 5 | Confirm no suggestion is highlighted or selected | UI is in a clean empty state |

#### Pass / Fail: ___________  Notes: ___________________________________

---

### TC-19
### Performance – Ranking API Response Time

**Priority:** Medium  
**Tags:** @performance  

#### Test Steps

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | In Postman, turn on "Response Time" display in the bottom status bar | Timing visible |
| 2 | Send POST `/api/rankings` with `{ "city": "Zurich" }` | Response received |
| 3 | Note the response time shown in Postman | Under **3000ms** |
| 4 | Send the same request 5 more times | Each response under 3000ms |
| 5 | Calculate the average response time | Average should be under 2000ms for a healthy server |

#### Pass / Fail: ___________  Notes: ___________________________________

---

### TC-20
### Performance – Autocomplete Suggestions Response Time

**Priority:** Low  
**Tags:** @performance  

#### Test Steps

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open DevTools → Network tab on the search page | Network tab ready |
| 2 | Type "Dur" in the search box | Suggestions request fires |
| 3 | In the Network tab, find the `suggestions?q=Dur` request | Request entry visible |
| 4 | Check the response time for that request | Under **500ms** |
| 5 | Type quickly: "D", "Du", "Dur" within 1 second | Observe network tab |
| 6 | Count the number of suggestion API calls made | Debounce reduces this to 1–2 calls, NOT 3 |

#### Pass / Fail: ___________  Notes: ___________________________________

---

## Edge Cases Summary

| Edge Case | Test ID | Expected Behaviour |
|-----------|---------|-------------------|
| Empty city string | TC-09 | 400, "city required" |
| Whitespace-only city | TC-10 | 400, treated as empty |
| Non-existent city | TC-11 | 404, "city not found" |
| SQL injection | TC-12 | 400, server unaffected |
| XSS in city name | TC-12 | 400, not reflected in response |
| Path traversal | TC-12 | 400 |
| 300-char city name | TC-13 | 400, "exceeds max length" |
| Numeric-only input | TC-14 | 400, "invalid format" |
| Weather API down | TC-15 | 503, friendly message, no stack trace |
| Weather API timeout | TC-16 | 504, timeout message |
| Single-char autocomplete | TC-06 | No API call fired |
| No matching suggestions | TC-17 | Empty array, "No results" in UI |
| Search box cleared | TC-18 | Dropdown hidden |
| Rapid keystrokes | TC-20 | Debounce limits calls to 1–2 |

---

## Bug Reporting Guidance

When logging a defect, include:

1. **Test Case ID** and name
2. **Steps to reproduce** (copy from test steps, add your specific data)
3. **Actual result** (what happened, with screenshots)
4. **Expected result** (from this script)
5. **Environment** (OS, browser, API version, server logs)
6. **Severity** — Critical / High / Medium / Low
7. **Request/Response** — always paste the full request body and response body

**Severity guide:**
- **Critical:** Server crashes, data corruption, security vulnerability exposed
- **High:** Core feature broken (no rankings returned for valid city, wrong status codes)
- **Medium:** UI glitch, wrong error message, minor schema mismatch
- **Low:** Cosmetic issue, performance slightly over threshold
