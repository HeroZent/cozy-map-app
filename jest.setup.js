// Load .env.local for integration tests (Expo env vars aren't auto-loaded by Jest).
require('dotenv').config({ path: '.env.local' });

// Silence specific RN warnings during tests.
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));
