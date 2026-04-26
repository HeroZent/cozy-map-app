// src/data/useStories.ts
import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import type { Story, ReactionEmoji } from './types';

export interface Bbox {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
}

export interface UseStoriesResult {
  stories: Story[];
  loading: boolean;
  error: Error | null;
}

type ReactionRow = { emoji: ReactionEmoji; user_id: string };
type ReplyCountRow = { count: number };
type StoryRow = Omit<Story, 'location' | 'reaction_count' | 'reaction_counts' | 'my_reactions' | 'reply_count'> & {
  lat: number;
  lng: number;
  reactions: ReactionRow[];
  replies: ReplyCountRow[];
};

function toStory(r: StoryRow, userId: string | null): Story {
  const reactions = r.reactions ?? [];
  const reaction_counts: Partial<Record<ReactionEmoji, number>> = {};
  for (const rx of reactions) {
    reaction_counts[rx.emoji] = (reaction_counts[rx.emoji] ?? 0) + 1;
  }
  return {
    ...r,
    location: { type: 'Point', coordinates: [r.lng, r.lat] },
    reaction_count: reactions.length,
    reaction_counts,
    my_reactions: userId
      ? reactions.filter((rx) => rx.user_id === userId).map((rx) => rx.emoji)
      : [],
    reply_count: r.replies?.[0]?.count ?? 0,
  };
}

function inBbox(s: StoryRow, bbox: Bbox): boolean {
  return (
    typeof s.lng === 'number' && typeof s.lat === 'number' &&
    s.lng >= bbox.minLng && s.lng <= bbox.maxLng &&
    s.lat >= bbox.minLat && s.lat <= bbox.maxLat
  );
}

const SELECT = 'id, author_id, mood, body, card_style, location_label, pin_mode, language, status, is_memory, created_at, lat, lng, reactions(emoji, user_id), replies(count)';

export function useStories(bbox: Bbox, refreshKey = 0): UseStoriesResult {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (refreshKey === 0) setLoading(true);

    (async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const userId = sessionData.session?.user?.id ?? null;

        const { data, error: e } = await supabase
          .from('stories')
          .select(SELECT)
          .eq('status', 'live')
          .order('created_at', { ascending: false })
          .limit(500);
        if (e) throw e;

        const rows = (data ?? []) as StoryRow[];
        const filtered = rows.filter((s) => inBbox(s, bbox)).map((r) => toStory(r, userId));

        if (!cancelled) {
          setStories(filtered);
          setLoading(false);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e as Error);
          setLoading(false);
        }
      }
    })();

    const channelName = `stories-live-${Math.random().toString(36).slice(2)}`;
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'stories' },
          (payload) => {
            const inserted = payload.new as { id: string; status: string };
            if (inserted.status !== 'live') return;
            (async () => {
              const { data: sessionData } = await supabase.auth.getSession();
              const userId = sessionData.session?.user?.id ?? null;
              const { data } = await supabase
                .from('stories')
                .select(SELECT)
                .eq('id', inserted.id)
                .single();
              if (data) {
                const row = data as StoryRow;
                if (inBbox(row, bbox)) {
                  setStories((prev) => [toStory(row, userId), ...prev]);
                }
              }
            })();
          })
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [bbox.minLng, bbox.minLat, bbox.maxLng, bbox.maxLat, refreshKey]);

  return { stories, loading, error };
}
