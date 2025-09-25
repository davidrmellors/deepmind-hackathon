// Jest setup file for SafeRoute AI Backend tests
import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Set test environment
process.env.NODE_ENV = 'test';
process.env.PORT = '3002';

// Mock external APIs for testing
jest.mock('@google/maps', () => ({
  createClient: jest.fn(() => ({
    directions: jest.fn(),
    geocode: jest.fn(),
    places: jest.fn()
  }))
}));

// Global test timeout
jest.setTimeout(30000);

// Console suppression for cleaner test output
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeAll(() => {
  console.error = jest.fn();
  console.warn = jest.fn();
});

afterAll(() => {
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});