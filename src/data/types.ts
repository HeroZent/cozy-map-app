export type Mood =
  | 'regret' | 'on_my_mind' | 'struggling' | 'hopeful'
  | 'memory' | 'dream' | 'unsent_letter' | 'forgiveness';

export type PinMode = 'gps' | 'dropped' | 'city';

export type StoryStatus = 'live' | 'hidden' | 'flagged' | 'removed';

export interface Story {
  id: string;
  author_id: string;
  mood: Mood;
  body: string;
  // PostGIS Point comes back as GeoJSON-ish object via supabase
  location: { type: 'Point'; coordinates: [number, number] };
  location_label: string | null;
  pin_mode: PinMode;
  language: string;
  status: StoryStatus;
  is_memory: boolean;
  created_at: string;
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
