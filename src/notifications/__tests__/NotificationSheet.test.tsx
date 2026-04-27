// src/notifications/__tests__/NotificationSheet.test.tsx
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { NotificationSheet } from '../NotificationSheet';

jest.mock('@/theme/ThemeContext', () => ({
  useTheme: () => ({
    surface: '#1a1a2e',
    textPrimary: '#f5e6c8',
    textMuted: 'rgba(245,230,200,0.5)',
    accent: '#f4c97a',
    fontFamily: 'serif',
  }),
}));

// Mutable per-test variables
let mockLoading = false;
let mockNotifications: any[] = [];
const mockMarkRead = jest.fn();

jest.mock('@/data/useNotifications', () => ({
  useNotifications: () => ({
    notifications: mockNotifications,
    activityCount: mockNotifications.filter((n: any) => n.type !== 'memory_promoted').length,
    activityNotificationIds: mockNotifications
      .filter((n: any) => n.type !== 'memory_promoted')
      .map((n: any) => n.id),
    memoryCount: mockNotifications.filter((n: any) => n.type === 'memory_promoted').length,
    markRead: mockMarkRead,
    loading: mockLoading,
  }),
}));

// NotificationRow renders a pressable testID per notification
jest.mock('@/notifications/NotificationRow', () => {
  const { Pressable, Text } = require('react-native');
  return {
    NotificationRow: ({
      notification,
      onPress,
    }: {
      notification: { id: string };
      onPress: () => void;
    }) => (
      <Pressable testID={`row-${notification.id}`} onPress={onPress}>
        <Text>{notification.id}</Text>
      </Pressable>
    ),
  };
});

function makeNotif(id: string, type = 'new_reply', withStories = true) {
  return {
    id,
    type,
    story_id: 's1',
    payload: {},
    created_at: new Date().toISOString(),
    stories: withStories
      ? { body: 'Hello world', location_label: 'Manila', lat: 14.5, lng: 121.0, created_at: new Date().toISOString() }
      : null,
  };
}

beforeEach(() => {
  mockLoading = false;
  mockNotifications = [];
  mockMarkRead.mockReset();
  mockMarkRead.mockResolvedValue(undefined);
});

test('shows ActivityIndicator while loading', () => {
  mockLoading = true;
  const { getByTestId } = render(
    <NotificationSheet onClose={jest.fn()} onNavigate={jest.fn()} />,
  );
  expect(getByTestId('notif-loading')).toBeTruthy();
});

test('shows empty state when there are no notifications', async () => {
  mockNotifications = [];
  const { getByText } = render(
    <NotificationSheet onClose={jest.fn()} onNavigate={jest.fn()} />,
  );
  await waitFor(() => expect(getByText('nothing new yet')).toBeTruthy());
});

test('calls markRead on mount with all notification IDs', async () => {
  mockNotifications = [
    makeNotif('n1', 'new_reply'),
    makeNotif('n2', 'memory_promoted'),
  ];
  render(<NotificationSheet onClose={jest.fn()} onNavigate={jest.fn()} />);
  await waitFor(() =>
    expect(mockMarkRead).toHaveBeenCalledWith(expect.arrayContaining(['n1', 'n2'])),
  );
});

test('renders a row for each notification in the snapshot', async () => {
  mockNotifications = [makeNotif('n1'), makeNotif('n2')];
  const { getByTestId } = render(
    <NotificationSheet onClose={jest.fn()} onNavigate={jest.fn()} />,
  );
  await waitFor(() => {
    expect(getByTestId('row-n1')).toBeTruthy();
    expect(getByTestId('row-n2')).toBeTruthy();
  });
});

test('tapping a row calls onClose and onNavigate with correct lat/lng', async () => {
  mockNotifications = [makeNotif('n1')];
  const onClose = jest.fn();
  const onNavigate = jest.fn();
  const { getByTestId } = render(
    <NotificationSheet onClose={onClose} onNavigate={onNavigate} />,
  );
  await waitFor(() => getByTestId('row-n1'));
  fireEvent.press(getByTestId('row-n1'));
  expect(onClose).toHaveBeenCalledTimes(1);
  expect(onNavigate).toHaveBeenCalledWith(14.5, 121.0);
});

test('tapping a row with stories=null calls onClose but not onNavigate', async () => {
  mockNotifications = [makeNotif('n1', 'new_reply', false)];
  const onClose = jest.fn();
  const onNavigate = jest.fn();
  const { getByTestId } = render(
    <NotificationSheet onClose={onClose} onNavigate={onNavigate} />,
  );
  await waitFor(() => getByTestId('row-n1'));
  fireEvent.press(getByTestId('row-n1'));
  expect(onClose).toHaveBeenCalledTimes(1);
  expect(onNavigate).not.toHaveBeenCalled();
});
