# =============================================================================
# Feature: Activity Ranking API – City-Based Weather Forecast Integration
# =============================================================================
# Author:   Srikanth Akuthota
# Date:     2026-05-01
# Purpose:  These BDD scenarios describe expected system behaviour from a
#           user's perspective, covering the happy path, edge cases, and
#           error handling for both the ranking API and the autocomplete
#           search box.
# =============================================================================

Feature: Activity Ranking based on 7-day City Weather Forecast

  As a user
  I want to enter a city name and receive a ranked list of activities for the next 7 days
  So that I can plan outdoor and indoor activities based on forecasted weather conditions

  Background:
    # These steps run before EVERY scenario in this file.
    # They ensure the API is reachable and in a known state before each test.
    Given the Activity Ranking API is available
    And the Open-Meteo weather service is reachable

  # ---------------------------------------------------------------------------
  # SECTION 1: Core Happy-Path Scenarios
  # ---------------------------------------------------------------------------

  @smoke @happy-path
  Scenario: User submits a valid city and receives a 7-day ranked activity list
    Given I have a valid city name "Cape Town"
    When I submit the city "Cape Town" to the activity ranking API
    Then the API response status should be 200
    And the response should contain activity rankings for exactly 7 days
    And each day should include a "date" in ISO 8601 format
    And each day should include rankings for the following activities:
      | activity              |
      | Skiing                |
      | Surfing               |
      | Outdoor Sightseeing   |
      | Indoor Sightseeing    |
    And each activity ranking should have a "rank" value between 1 and 10
    And each activity ranking should include a non-empty "reasoning" string

  @happy-path
  Scenario: Response reasoning reflects actual weather conditions
    Given the weather forecast for "Hokkaido" includes heavy snowfall on day 1
    When I submit the city "Hokkaido" to the activity ranking API
    Then the day 1 ranking for "Skiing" should have a rank of 8 or above
    And the day 1 "Skiing" reasoning should mention snow-related conditions

  @happy-path
  Scenario: Warm clear-sky city ranks Outdoor Sightseeing highly
    Given the weather forecast for "Barcelona" shows clear skies and 22 degrees on day 1
    When I submit the city "Barcelona" to the activity ranking API
    Then the day 1 ranking for "Outdoor Sightseeing" should have a rank of 7 or above
    And the day 1 "Outdoor Sightseeing" reasoning should mention clear or warm conditions

  @happy-path
  Scenario: Rainy city ranks Indoor Sightseeing higher than Outdoor Sightseeing
    Given the weather forecast for "London" shows heavy rain on day 3
    When I submit the city "London" to the activity ranking API
    Then the day 3 ranking for "Indoor Sightseeing" should be higher than "Outdoor Sightseeing"

  # ---------------------------------------------------------------------------
  # SECTION 2: Response Contract / Schema Validation
  # ---------------------------------------------------------------------------

  @contract @schema
  Scenario: API response matches the expected JSON schema
    When I submit the city "Sydney" to the activity ranking API
    Then the response body should be valid JSON
    And the response should contain a top-level "city" field equal to "Sydney"
    And the response should contain a top-level "forecast" array of length 7
    And each forecast item should contain the fields: "date", "activities"
    And each activity item should contain the fields: "name", "rank", "reasoning"

  @contract
  Scenario: Rank values are always integers within the allowed range
    When I submit the city "Tokyo" to the activity ranking API
    Then every "rank" field in the response should be an integer
    And every "rank" field should be greater than or equal to 1
    And every "rank" field should be less than or equal to 10

  @contract
  Scenario: Date values cover exactly the next 7 calendar days
    Given today's date is known
    When I submit the city "New York" to the activity ranking API
    Then the first forecast date should be tomorrow's date
    And the last forecast date should be 7 days from today
    And there should be no duplicate dates in the forecast

  # ---------------------------------------------------------------------------
  # SECTION 3: Autocomplete / Search Suggestions
  # ---------------------------------------------------------------------------

  @autocomplete @happy-path
  Scenario: Typing a partial city name returns matching suggestions
    Given I am on the city search page
    When I type "Cape" into the search box
    Then the autocomplete dropdown should appear
    And the suggestions should include "Cape Town"
    And all suggestions should contain the text "Cape" (case-insensitive)

  @autocomplete @happy-path
  Scenario: Autocomplete suggestions appear after typing at least 2 characters
    Given I am on the city search page
    When I type "Lo" into the search box
    Then autocomplete suggestions should be displayed
    And at least 1 suggestion should be visible

  @autocomplete
  Scenario: Autocomplete does NOT trigger on a single character
    Given I am on the city search page
    When I type "L" into the search box
    Then no autocomplete suggestions should be displayed

  @autocomplete @happy-path
  Scenario: Selecting an autocomplete suggestion triggers the activity ranking request
    Given I am on the city search page
    And autocomplete suggestions are showing for "Johan"
    When I select "Johannesburg" from the suggestions
    Then the activity ranking API should be called with city "Johannesburg"
    And the activity rankings for "Johannesburg" should be displayed

  @autocomplete
  Scenario: Autocomplete is case-insensitive
    Given I am on the city search page
    When I type "caPE tOwN" into the search box
    Then the suggestions should include "Cape Town"

  # ---------------------------------------------------------------------------
  # SECTION 4: Input Validation & Error Handling
  # ---------------------------------------------------------------------------

  @error-handling @validation
  Scenario: Submitting an empty city name returns a validation error
    When I submit an empty city name to the activity ranking API
    Then the API response status should be 400
    And the error message should indicate that "city" is required

  @error-handling @validation
  Scenario: Submitting a city name with only whitespace returns a validation error
    When I submit the city "     " to the activity ranking API
    Then the API response status should be 400
    And the error message should indicate that "city" is required

  @error-handling @validation
  Scenario: Submitting a non-existent city returns a not-found error
    When I submit the city "ZzzzInvalidCityXxx123" to the activity ranking API
    Then the API response status should be 404
    And the error message should indicate the city was not found

  @error-handling @validation
  Scenario: Submitting a city name with special characters returns an error
    When I submit the city "'; DROP TABLE cities;--" to the activity ranking API
    Then the API response status should be 400
    And the error message should indicate invalid input

  @error-handling @validation
  Scenario: Submitting a numeric-only city name returns a validation error
    When I submit the city "12345" to the activity ranking API
    Then the API response status should be 400
    And the error message should indicate invalid city name format

  # ---------------------------------------------------------------------------
  # SECTION 5: External API Failure / Resilience
  # ---------------------------------------------------------------------------

  @resilience @mocked
  Scenario: Graceful degradation when Open-Meteo API is unavailable
    Given the Open-Meteo weather API is down
    When I submit the city "Paris" to the activity ranking API
    Then the API response status should be 503
    And the error message should indicate a temporary service unavailability
    And the error should NOT expose internal stack traces

  @resilience @mocked
  Scenario: Request times out when Open-Meteo API is too slow
    Given the Open-Meteo weather API has a response delay of 10 seconds
    And the activity ranking API timeout threshold is 5 seconds
    When I submit the city "Berlin" to the activity ranking API
    Then the API response status should be 504
    And the error message should indicate a gateway timeout

  # ---------------------------------------------------------------------------
  # SECTION 6: Autocomplete Edge Cases
  # ---------------------------------------------------------------------------

  @autocomplete @edge-case
  Scenario: No autocomplete suggestions found for an unrecognised input
    Given I am on the city search page
    When I type "Xyzqwerty" into the search box
    Then the autocomplete dropdown should show a "No results found" message

  @autocomplete @edge-case
  Scenario: Autocomplete is dismissed when the user clears the search box
    Given I am on the city search page
    And autocomplete suggestions are visible for "Paris"
    When I clear the search box
    Then the autocomplete dropdown should be hidden

  @autocomplete @edge-case
  Scenario: Autocomplete limits the number of visible suggestions
    Given I am on the city search page
    When I type "San" into the search box
    Then the autocomplete dropdown should show no more than 10 suggestions

  # ---------------------------------------------------------------------------
  # SECTION 7: Performance
  # ---------------------------------------------------------------------------

  @performance
  Scenario: API responds within an acceptable time for a valid city
    When I submit the city "Zurich" to the activity ranking API
    Then the API should respond within 3000 milliseconds

  @performance
  Scenario: Autocomplete suggestions appear within an acceptable time
    Given I am on the city search page
    When I type "Dur" into the search box
    Then autocomplete suggestions should appear within 500 milliseconds
