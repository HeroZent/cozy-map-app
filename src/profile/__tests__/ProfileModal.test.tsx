// src/profile/__tests__/ProfileModal.test.tsx
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { ProfileModal } from '../ProfileModal';

// Mock expo-linear-gradient (needed for StylePicker)
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
let mockStories: any[] = [];
const mockDeleteStory = jest.fn();

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
  useMyStories: () => ({ stories: mockStories, loading: false, error: null, deleteStory: mockDeleteStory }),
}));

jest.mock('@/profile/HandleClaim', () => ({
  HandleClaim: () => null,
}));

// MySulatRow renders a pressable testID per story so tests can tap the X button
jest.mock('@/profile/MySulatRow', () => {
  const { Pressable, Text } = require('react-native');
  return {
    MySulatRow: ({ story, onDelete }: { story: { id: string }; onDelete?: () => void }) => (
      <>
        {onDelete && (
          <Pressable testID={`delete-btn-${story.id}`} onPress={onDelete}>
            <Text>✕</Text>
          </Pressable>
        )}
      </>
    ),
  };
});

jest.mock('@/profile/useUnreadReplies', () => ({
  getSeenCount: jest.fn().mockResolvedValue(0),
  isUnread: jest.fn().mockReturnValue(false),
  markSeen: jest.fn(),
}));

beforeEach(() => {
  mockDisplayHandle = null;
  mockStories = [];
  mockDeleteStory.mockReset();
  mockDeleteStory.mockResolvedValue(undefined);
});

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

test('tapping X on a row shows the confirmation sheet', async () => {
  mockStories = [{ id: 's1', body: 'hello', location_label: null, created_at: new Date().toISOString(), lat: 14, lng: 121, is_memory: false, reaction_count: 0, reply_count: 0 }];
  const { getByTestId, getByText } = render(
    <ProfileModal onClose={jest.fn()} onNavigate={jest.fn()} />,
  );
  fireEvent.press(getByTestId('delete-btn-s1'));
  await waitFor(() => expect(getByText('Delete sulat')).toBeTruthy());
});

test('Cancel dismisses the confirmation sheet without calling deleteStory', async () => {
  mockStories = [{ id: 's1', body: 'hello', location_label: null, created_at: new Date().toISOString(), lat: 14, lng: 121, is_memory: false, reaction_count: 0, reply_count: 0 }];
  const { getByTestId, getByText, queryByText } = render(
    <ProfileModal onClose={jest.fn()} onNavigate={jest.fn()} />,
  );
  fireEvent.press(getByTestId('delete-btn-s1'));
  await waitFor(() => getByText('Cancel'));
  fireEvent.press(getByText('Cancel'));
  await waitFor(() => expect(queryByText('Delete sulat')).toBeNull());
  expect(mockDeleteStory).not.toHaveBeenCalled();
});

test('confirming delete calls deleteStory and dismisses the sheet', async () => {
  mockStories = [{ id: 's1', body: 'hello', location_label: null, created_at: new Date().toISOString(), lat: 14, lng: 121, is_memory: false, reaction_count: 0, reply_count: 0 }];
  const { getByTestId, getByText, queryByText } = render(
    <ProfileModal onClose={jest.fn()} onNavigate={jest.fn()} />,
  );
  fireEvent.press(getByTestId('delete-btn-s1'));
  await waitFor(() => getByText('Delete'));
  fireEvent.press(getByText('Delete'));
  await waitFor(() => expect(mockDeleteStory).toHaveBeenCalledWith('s1'));
  await waitFor(() => expect(queryByText('Delete sulat')).toBeNull());
});

test('when deleteStory throws, sheet dismisses and story stays', async () => {
  mockDeleteStory.mockRejectedValue(new Error('db down'));
  mockStories = [{ id: 's1', body: 'hello', location_label: null, created_at: new Date().toISOString(), lat: 14, lng: 121, is_memory: false, reaction_count: 0, reply_count: 0 }];
  const { getByTestId, getByText, queryByText } = render(
    <ProfileModal onClose={jest.fn()} onNavigate={jest.fn()} />,
  );
  fireEvent.press(getByTestId('delete-btn-s1'));
  await waitFor(() => getByText('Delete'));
  fireEvent.press(getByText('Delete'));
  await waitFor(() => expect(queryByText('Delete sulat')).toBeNull());
  expect(mockDeleteStory).toHaveBeenCalledWith('s1');
});
