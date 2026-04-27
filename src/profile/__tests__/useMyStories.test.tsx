// src/profile/__tests__/useMyStories.test.tsx
import React from 'react';
import { render, waitFor, act } from '@testing-library/react-native';
import { Text } from 'react-native';
import { useMyStories } from '../useMyStories';

// Controls mock behaviour per test
let mockStories: any[] = [];
let mockDeleteError: { message: string } | null = null;

jest.mock('@/data/supabase', () => ({
  supabase: {
    auth: {
      getSession: () =>
        Promise.resolve({ data: { session: { user: { id: 'u1' } } } }),
    },
    from: (table: string) => {
      if (table === 'stories') {
        return {
          // used by initial fetch
          select: () => ({
            eq: () => ({
              eq: () => ({
                order: () =>
                  Promise.resolve({ data: mockStories, error: null }),
              }),
            }),
          }),
          // used by deleteStory
          delete: () => ({
            eq: () => Promise.resolve({ error: mockDeleteError }),
          }),
        };
      }
      return {};
    },
  },
}));

function Harness({
  onReady,
}: {
  onReady: (deleteStory: (id: string) => Promise<void>, ids: string[]) => void;
}) {
  const { stories, loading, deleteStory } = useMyStories();
  if (!loading) {
    onReady(deleteStory, stories.map((s) => s.id));
  }
  return <Text>{loading ? 'loading' : `count-${stories.length}`}</Text>;
}

describe('useMyStories – deleteStory', () => {
  beforeEach(() => {
    mockDeleteError = null;
    mockStories = [
      {
        id: 's1',
        body: 'Hello',
        location_label: 'Manila',
        created_at: new Date().toISOString(),
        lat: 14,
        lng: 121,
        is_memory: false,
        reactions: [],
        replies: [{ count: 0 }],
      },
      {
        id: 's2',
        body: 'World',
        location_label: null,
        created_at: new Date().toISOString(),
        lat: 14,
        lng: 121,
        is_memory: false,
        reactions: [],
        replies: [{ count: 0 }],
      },
    ];
  });

  it('removes the story from state on successful delete', async () => {
    let capturedDelete!: (id: string) => Promise<void>;
    const { getByText } = render(
      <Harness
        onReady={(del) => { capturedDelete = del; }}
      />,
    );
    await waitFor(() => getByText('count-2'));
    await act(async () => { await capturedDelete('s1'); });
    await waitFor(() => getByText('count-1'));
  });

  it('keeps the story in state when delete returns an error', async () => {
    mockDeleteError = { message: 'db down' };
    let capturedDelete!: (id: string) => Promise<void>;
    const { getByText } = render(
      <Harness
        onReady={(del) => { capturedDelete = del; }}
      />,
    );
    await waitFor(() => getByText('count-2'));
    await act(async () => {
      await expect(capturedDelete('s1')).rejects.toBeTruthy();
    });
    expect(getByText('count-2')).toBeTruthy();
  });
});
