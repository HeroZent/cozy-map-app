import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { ProfileModal } from '../ProfileModal';

// Mock expo-linear-gradient (needed for StylePicker → swatches don't use gradient, but mock is defensive)
jest.mock('expo-linear-gradient', () => {
  const { View } = require('react-native');
  return {
    LinearGradient: ({ children, style }: { children: React.ReactNode; style: object }) =>
      require('react').createElement(View, { style }, children),
  };
});

// Mutable variables — set per test
let mockDisplayHandle: string | null = null;
let mockPreferredStyle = 'a';

jest.mock('@/data/useUser', () => ({
  useUser: () => ({
    user: mockDisplayHandle === null
      ? null
      : {
          id: 'u1',
          display_handle: mockDisplayHandle,
          preferred_card_style: mockPreferredStyle,
          device_fingerprint: 'fp1',
          email: null,
          theme_preference: 'lantern',
          banned_at: null,
          created_at: '2026-01-01',
        },
    loading: false,
    error: null,
  }),
}));

jest.mock('@/data/supabase', () => ({
  supabase: {
    from: () => ({
      update: () => ({ eq: () => Promise.resolve({ error: null }) }),
    }),
    auth: { getSession: () => Promise.resolve({ data: { session: null } }) },
  },
}));

jest.mock('@/profile/useMyStories', () => ({
  useMyStories: () => ({ stories: [], loading: false, error: null }),
}));

jest.mock('@/profile/HandleClaim', () => ({
  HandleClaim: () => null,
}));

jest.mock('@/profile/MySulatRow', () => ({
  MySulatRow: () => null,
}));

jest.mock('@/profile/useUnreadReplies', () => ({
  getSeenCount: jest.fn().mockResolvedValue(0),
  isUnread: jest.fn().mockReturnValue(false),
  markSeen: jest.fn(),
}));

test('style picker is hidden when user has no claimed handle', () => {
  mockDisplayHandle = null;
  const { queryByTestId } = render(
    <ProfileModal onClose={jest.fn()} onNavigate={jest.fn()} />,
  );
  expect(queryByTestId('style-swatch-a')).toBeNull();
});

test('style picker is visible when user has a claimed handle', async () => {
  mockDisplayHandle = 'cozy_writer';
  mockPreferredStyle = 'a';
  const { getByTestId } = render(
    <ProfileModal onClose={jest.fn()} onNavigate={jest.fn()} />,
  );
  await waitFor(() => {
    expect(getByTestId('style-swatch-a')).toBeTruthy();
  });
});

test('selecting a style shows Saved ✓', async () => {
  mockDisplayHandle = 'cozy_writer';
  mockPreferredStyle = 'a';
  const { getByTestId, getByText } = render(
    <ProfileModal onClose={jest.fn()} onNavigate={jest.fn()} />,
  );
  await waitFor(() => getByTestId('style-swatch-b'));
  fireEvent.press(getByTestId('style-swatch-b'));
  await waitFor(() => expect(getByText('Saved ✓')).toBeTruthy());
});
