// cucumber.js
// ============================================================================
// Cucumber runner configuration.
// - Tells Cucumber where to find features, step definitions, and support files.
// - Configures TypeScript transpilation via ts-node.
// - Sets up HTML/JSON reporting for CI pipelines.
// ============================================================================

module.exports = {
  default: {
    // Where to find the .feature files
    paths: ['../bdd-scenarios.feature'],

    // TypeScript support: require ts-node and all support/step-definition files
    requireModule: ['ts-node/register'],
    require: [
      'support/hooks.ts',
      'support/world.ts',
      'step-definitions/**/*.ts'
    ],

    // Default formatter: progress in terminal + JSON for CI reporting
    format: [
      'progress-bar',
      'json:reports/cucumber-report.json'
    ],

    // Fail fast in CI — stop after the first failure
    // Comment this out for local development to see all failures at once
    // failFast: true,

    // How long (ms) a step can run before Cucumber marks it as timed-out
    timeout: 15000
  }
}
