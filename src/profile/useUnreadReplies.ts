// src/profile/useUnreadReplies.ts
import { kvGet, kvSet } from '@/lib/persistence';

const key = (storyId: string) => `sulat.reply_seen.${storyId}`;

/** Store the reply count the user last saw for a story. */
export async function markSeen(storyId: string, count: number): Promise<void> {
  await kvSet(key(storyId), String(count));
}

/** Returns the last-seen reply count, or 0 if never seen. */
export async function getSeenCount(storyId: string): Promise<number> {
  const val = await kvGet(key(storyId));
  return val !== null && !Number.isNaN(parseInt(val, 10)) ? parseInt(val, 10) : 0;
}

/** Returns true when there are replies the user has not yet seen. */
export function isUnread(currentCount: number, seenCount: number): boolean {
  return currentCount > seenCount;
}
