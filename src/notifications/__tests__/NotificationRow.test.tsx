// src/notifications/__tests__/NotificationRow.test.tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { NotificationRow } from '../NotificationRow';
import type { Notification } from '@/data/useNotifications';

jest.mock('@/theme/ThemeContext', () => ({
  useTheme: () => ({
    surface: '#1a1a2e',
    textPrimary: '#f5e6c8',
    textMuted: 'rgba(245,230,200,0.5)',
    accent: '#f4c97a',
  }),
}));

const baseStories = {
  body: 'A quiet afternoon in Intramuros, the old city walls…',
  location_label: 'Manila',
  lat: 14.5995,
  lng: 120.9842,
  created_at: new Date(Date.now() - 3 * 86400000).toISOString(), // 3 days ago
};

function makeNotif(overrides: Partial<Notification> = {}): Notification {
  return {
    id: 'n1',
    type: 'new_reply',
    story_id: 's1',
    payload: {},
    created_at: new Date(Date.now() - 2 * 60 * 1000).toISOString(), // 2 min ago
    stories: baseStories,
    ...overrides,
  };
}

describe('NotificationRow', () => {
  it('renders 💬 icon for new_reply', () => {
    const { getByText } = render(
      <NotificationRow notification={makeNotif({ type: 'new_reply' })} isUnread={true} onPress={jest.fn()} />,
    );
    expect(getByText('💬')).toBeTruthy();
  });

  it('renders ✦ icon for new_reaction', () => {
    const { getByText } = render(
      <NotificationRow notification={makeNotif({ type: 'new_reaction' })} isUnread={true} onPress={jest.fn()} />,
    );
    expect(getByText('✦')).toBeTruthy();
  });

  it('renders ✦ icon for memory_promoted', () => {
    const { getByText } = render(
      <NotificationRow notification={makeNotif({ type: 'memory_promoted' })} isUnread={true} onPress={jest.fn()} />,
    );
    expect(getByText('✦')).toBeTruthy();
  });

  it('shows gold left-border when isUnread=true', () => {
    const { getByTestId } = render(
      <NotificationRow notification={makeNotif()} isUnread={true} onPress={jest.fn()} />,
    );
    expect(getByTestId('notification-row-n1')).toHaveStyle({ borderLeftColor: '#f4c97a' });
  });

  it('has transparent left-border when isUnread=false', () => {
    const { getByTestId } = render(
      <NotificationRow notification={makeNotif()} isUnread={false} onPress={jest.fn()} />,
    );
    expect(getByTestId('notification-row-n1')).toHaveStyle({ borderLeftColor: 'transparent' });
  });

  it('calls onPress when the row is pressed', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <NotificationRow notification={makeNotif()} isUnread={true} onPress={onPress} />,
    );
    fireEvent.press(getByTestId('notification-row-n1'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('truncates excerpt to ~40 chars with ellipsis', () => {
    const longBody = 'A'.repeat(50);
    const { getByText } = render(
      <NotificationRow
        notification={makeNotif({ stories: { ...baseStories, body: longBody } })}
        isUnread={true}
        onPress={jest.fn()}
      />,
    );
    // First 40 chars + '…'
    expect(getByText(`${'A'.repeat(40)}…`)).toBeTruthy();
  });
});
