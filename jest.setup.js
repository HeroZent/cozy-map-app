// Load .env.local for integration tests (Expo env vars aren't auto-loaded by Jest).
require('dotenv').config({ path: '.env.local' });

// Mock expo-secure-store with an in-memory store so Supabase can persist its
// auth session tokens during a test run. Using all-null stubs would cause
// Supabase JS to lose the JWT between signInAnonymously() and subsequent DB
// calls, making every RLS-gated insert fail.
const secureStoreMemory = {};
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn((key) => Promise.resolve(secureStoreMemory[key] ?? null)),
  setItemAsync: jest.fn((key, value) => {
    secureStoreMemory[key] = value;
    return Promise.resolve();
  }),
  deleteItemAsync: jest.fn((key) => {
    delete secureStoreMemory[key];
    return Promise.resolve();
  }),
}));

// Auto-mock expo-audio for all tests; use __mocks__/expo-audio.ts.
jest.mock('expo-audio');

// Mock AsyncStorage with the official in-memory mock.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
