// tests/unit/useMyStories.test.ts
import { renderHook, waitFor } from '@testing-library/react-native';
import { useMyStories } from '@/profile/useMyStories';

jest.mock('@/data/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn().mockResolvedValue({
        data: { session: { user: { id: 'user-123' } } },
      }),
    },
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({
        data: [
          {
            id: 'story-1',
            body: 'hello from Manila',
            location_label: 'Ermita',
            created_at: '2026-04-01T00:00:00Z',
            lat: 14.58,
            lng: 120.98,
            reactions: [{ emoji: '❤️' }, { emoji: '🌙' }],
            replies: [{ count: 3 }],
          },
        ],
        error: null,
      }),
    }),
  },
}));

test('maps rows to MyStory shape', async () => {
  const { result } = renderHook(() => useMyStories());
  await waitFor(() => expect(result.current.loading).toBe(false));

  expect(result.current.stories).toHaveLength(1);
  const s = result.current.stories[0];
  expect(s.id).toBe('story-1');
  expect(s.body).toBe('hello from Manila');
  expect(s.reaction_count).toBe(2);  // reactions.length
  expect(s.reply_count).toBe(3);     // replies[0].count
  expect(s.lat).toBe(14.58);
  expect(s.lng).toBe(120.98);
});

test('returns empty array when user has no stories', async () => {
  const { supabase } = require('@/data/supabase');
  supabase.from.mockReturnValue({
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockResolvedValue({ data: [], error: null }),
  });

  const { result } = renderHook(() => useMyStories());
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.stories).toHaveLength(0);
});
