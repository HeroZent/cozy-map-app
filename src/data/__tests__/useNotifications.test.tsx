// src/data/__tests__/useNotifications.test.ts
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
        in: () => Promise.resolve({ error: null }),
      }),
    }),
  },
}));

// Test harness wraps the hook so we can observe its output
function Harness() {
  const { notifications, memoryCount, markRead, loading } = useNotifications();
  if (loading) return <Text>loading</Text>;
  return (
    <>
      <Text>{`count-${memoryCount}`}</Text>
      <Text>{`total-${notifications.length}`}</Text>
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
});
