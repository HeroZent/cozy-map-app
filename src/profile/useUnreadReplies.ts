// src/profile/useUnreadReplies.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

const key = (storyId: string) => `reply_seen_${storyId}`;

/** Store the reply count the user last saw for a story. */
export async function markSeen(storyId: string, count: number): Promise<void> {
  await AsyncStorage.setItem(key(storyId), String(count));
}

/** Returns the last-seen reply count, or 0 if never seen. */
export async function getSeenCount(storyId: string): Promise<number> {
  const val = await AsyncStorage.getItem(key(storyId));
  return val !== null ? parseInt(val, 10) : 0;
}

/** Returns true when there are replies the user has not yet seen. */
export function isUnread(currentCount: number, seenCount: number): boolean {
  return currentCount > seenCount;
}
