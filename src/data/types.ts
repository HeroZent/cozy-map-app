export type Mood =
  | 'regret' | 'on_my_mind' | 'struggling' | 'hopeful'
  | 'memory' | 'dream' | 'unsent_letter' | 'forgiveness';

export type PinMode = 'gps' | 'dropped' | 'city';

export type StoryStatus = 'live' | 'hidden' | 'flagged' | 'removed';

import type { ReactionEmoji } from '@/reactions/catalog';
import type { CardStyleId } from '@/story/cardStyles';
export type { ReactionEmoji };

export interface Story {
  id: string;
  author_id: string;
  mood: Mood;
  body: string;
  card_style: CardStyleId;
  location: { type: 'Point'; coordinates: [number, number] };
  location_label: string | null;
  pin_mode: PinMode;
  language: string;
  status: StoryStatus;
  is_memory: boolean;
  has_crisis_note: boolean;
  created_at: string;
  reaction_count: number;
  reaction_counts: Partial<Record<ReactionEmoji, number>>;
  my_reactions: ReactionEmoji[];
  reply_count: number;
  /** Author's claimed handle, or null if they never claimed one. UI falls
   *  back to 'anon' for null — matches the ReplyBubble convention. */
  display_handle: string | null;
}

export interface User {
  id: string;
  device_fingerprint: string;
  email: string | null;
  display_handle: string | null;
  theme_preference: string;
  preferred_card_style: CardStyleId | null;
  banned_at: string | null;
  created_at: string;
}
