// tests/unit/useUnreadReplies.test.ts
import { markSeen, getSeenCount, isUnread } from '@/profile/useUnreadReplies';

const store: Record<string, string> = {};

jest.mock('@/lib/persistence', () => ({
  kvGet: jest.fn((k: string) => Promise.resolve(store[k] ?? null)),
  kvSet: jest.fn((k: string, v: string) => {
    store[k] = v;
    return Promise.resolve();
  }),
}));

beforeEach(() => {
  Object.keys(store).forEach((k) => delete store[k]);
});

test('getSeenCount returns 0 for an unknown story', async () => {
  expect(await getSeenCount('unknown-id')).toBe(0);
});

test('markSeen + getSeenCount round-trip', async () => {
  await markSeen('story-1', 3);
  expect(await getSeenCount('story-1')).toBe(3);
});

test('isUnread returns true when currentCount > seenCount', () => {
  expect(isUnread(3, 1)).toBe(true);
});

test('isUnread returns false when currentCount equals seenCount', () => {
  expect(isUnread(2, 2)).toBe(false);
});

test('isUnread returns false when currentCount < seenCount', () => {
  expect(isUnread(1, 3)).toBe(false);
});
