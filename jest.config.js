module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['@testing-library/jest-native/extend-expect'],
  setupFiles: ['<rootDir>/jest.setup.js'],
  testMatch: ['**/tests/unit/**/*.test.(ts|tsx)', '**/tests/integration/**/*.test.(ts|tsx)', '**/src/**/__tests__/**/*.test.(ts|tsx)'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
  transformIgnorePatterns: [
    'node_modules/(?!(jest-)?react-native|@react-native|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|@maplibre/.*|maplibre-gl|supercluster|@supabase/.*)',
  ],
};
