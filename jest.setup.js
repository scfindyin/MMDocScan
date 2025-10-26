// Jest setup file
// Add custom matchers or global test configurations here

// Set required environment variables for tests
process.env.ANTHROPIC_API_KEY = 'test-api-key-from-jest-setup';

// Suppress console logs during tests (optional)
// global.console = {
//   ...console,
//   log: jest.fn(),
//   error: jest.fn(),
//   warn: jest.fn(),
// };
