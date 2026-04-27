// src/data/__tests__/useNotifications.test.tsx
import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import { Text, Pressable } from 'react-native';
import { useNotifications } from '../useNotifications';

// Mutable state — modified per test to control mock behavior
let mockNotifications: any[] = [];
let mockFetchError: { message: string } | null = null;
let mockUserId: string | null = 'user-1';

jest.mock('@/data/supabase', () => ({
  supabase: {
    auth: {
      getSession: () =>
        Promise.resolve({
          data: { session: mockUserId ? { user: { id: mockUserId } } : null },
        }),
    },
    from: () => ({
      select: () => ({
        is: () => Promise.resolve({ data: mockNotifications, error: mockFetchError }),
      }),
      update: () => ({
        eq: () => ({
          in: () => Promise.resolve({ error: null }),
        }),
        in: () => Promise.resolve({ error: null }),
      }),
    }),
  },
}));

// Test harness wraps the hook so we can observe its output
function Harness() {
  const { notifications, memoryCount, activityCount, activityNotificationIds, markRead, loading } = useNotifications();
  if (loading) return <Text>loading</Text>;
  return (
    <>
      <Text>{`count-${memoryCount}`}</Text>
      <Text>{`total-${notifications.length}`}</Text>
      <Text>{`activity-${activityCount}`}</Text>
      <Text>{`ids-${activityNotificationIds.join(',')}`}</Text>
      <Text>{`stories-body-${notifications[0]?.stories?.body ?? 'none'}`}</Text>
      <Pressable onPress={() => markRead(notifications.map((n) => n.id))}>
        <Text>mark-read</Text>
      </Pressable>
    </>
  );
}

describe('useNotifications', () => {
  beforeEach(() => {
    mockNotifications = [];
    mockFetchError = null;
    mockUserId = 'user-1';
  });

  it('returns memoryCount 0 and empty notifications when there are none', async () => {
    const { getByText } = render(<Harness />);
    await waitFor(() => expect(getByText('count-0')).toBeTruthy());
    expect(getByText('total-0')).toBeTruthy();
  });

  it('counts only memory_promoted type notifications', async () => {
    mockNotifications = [
      { id: 'n1', type: 'memory_promoted', story_id: 's1', payload: {}, created_at: '2026-01-01' },
      { id: 'n2', type: 'memory_promoted', story_id: 's2', payload: {}, created_at: '2026-01-02' },
      { id: 'n3', type: 'new_reply', story_id: 's3', payload: {}, created_at: '2026-01-03' },
    ];
    const { getByText } = render(<Harness />);
    await waitFor(() => expect(getByText('count-2')).toBeTruthy());
    expect(getByText('total-3')).toBeTruthy();
  });

  it('returns empty when not logged in', async () => {
    mockUserId = null;
    const { getByText } = render(<Harness />);
    await waitFor(() => expect(getByText('count-0')).toBeTruthy());
    expect(getByText('total-0')).toBeTruthy();
  });

  it('fails open on fetch error — memoryCount stays 0, banner stays hidden', async () => {
    mockFetchError = { message: 'db down' };
    const { getByText } = render(<Harness />);
    await waitFor(() => expect(getByText('count-0')).toBeTruthy());
    expect(getByText('total-0')).toBeTruthy();
  });

  it('markRead removes notifications from state optimistically', async () => {
    mockNotifications = [
      { id: 'n1', type: 'memory_promoted', story_id: 's1', payload: {}, created_at: '2026-01-01' },
    ];
    const { getByText } = render(<Harness />);
    await waitFor(() => expect(getByText('count-1')).toBeTruthy());
    fireEvent.press(getByText('mark-read'));
    await waitFor(() => expect(getByText('count-0')).toBeTruthy());
    expect(getByText('total-0')).toBeTruthy();
  });

  it('activityCount counts new_reply and new_reaction but not memory_promoted', async () => {
    mockNotifications = [
      { id: 'n1', type: 'new_reply', story_id: 's1', payload: {}, created_at: '2026-01-01' },
      { id: 'n2', type: 'new_reaction', story_id: 's2', payload: { emoji: 'heart' }, created_at: '2026-01-02' },
      { id: 'n3', type: 'memory_promoted', story_id: 's3', payload: {}, created_at: '2026-01-03' },
    ];
    const { getByText } = render(<Harness />);
    await waitFor(() => expect(getByText('activity-2')).toBeTruthy());
    expect(getByText('ids-n1,n2')).toBeTruthy();
  });

  it('activityCount is 0 and ids is empty when there are no activity notifications', async () => {
    mockNotifications = [
      { id: 'n1', type: 'memory_promoted', story_id: 's1', payload: {}, created_at: '2026-01-01' },
    ];
    const { getByText } = render(<Harness />);
    await waitFor(() => expect(getByText('activity-0')).toBeTruthy());
    expect(getByText('ids-')).toBeTruthy();
  });

  it('passes stories join data through to notifications', async () => {
    mockNotifications = [
      {
        id: 'n1',
        type: 'new_reply',
        story_id: 's1',
        payload: {},
        created_at: '2026-01-01T00:00:00Z',
        stories: {
          body: 'A quiet afternoon in Intramuros',
          location_label: 'Manila',
          lat: 14.5995,
          lng: 120.9842,
          created_at: '2026-01-01T00:00:00Z',
        },
      },
    ];
    const { getByText } = render(<Harness />);
    await waitFor(() => expect(getByText('total-1')).toBeTruthy());
    expect(getByText('count-0')).toBeTruthy(); // type is new_reply, not memory_promoted
    expect(getByText('activity-1')).toBeTruthy();
    // Verify stories join data actually flows through to the Notification object
    expect(getByText('stories-body-A quiet afternoon in Intramuros')).toBeTruthy();
  });
});
