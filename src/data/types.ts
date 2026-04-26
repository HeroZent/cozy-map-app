export type Mood =
  | 'regret' | 'on_my_mind' | 'struggling' | 'hopeful'
  | 'memory' | 'dream' | 'unsent_letter' | 'forgiveness';

export type PinMode = 'gps' | 'dropped' | 'city';

export type StoryStatus = 'live' | 'hidden' | 'flagged' | 'removed';

import type { ReactionEmoji } from '@/reactions/catalog';
export type { ReactionEmoji };

export interface Story {
  id: string;
  author_id: string;
  mood: Mood;
  body: string;
  location: { type: 'Point'; coordinates: [number, number] };
  location_label: string | null;
  pin_mode: PinMode;
  language: string;
  status: StoryStatus;
  is_memory: boolean;
  created_at: string;
  reaction_count: number;
  reaction_counts: Partial<Record<ReactionEmoji, number>>;
  my_reactions: ReactionEmoji[];
  reply_count: number;
}

export interface User {
  id: string;
  device_fingerprint: string;
  email: string | null;
  display_handle: string | null;
  theme_preference: string;
  banned_at: string | null;
  created_at: string;
}
