// src/profile/useMyStories.ts
import { useState, useEffect } from 'react';
import { supabase } from '@/data/supabase';

export interface MyStory {
  id: string;
  body: string;
  location_label: string | null;
  created_at: string;
  reaction_count: number;
  reply_count: number;
  lat: number;
  lng: number;
  is_memory: boolean;
}

export interface UseMyStoriesResult {
  stories: MyStory[];
  loading: boolean;
  error: Error | null;
}

type ReactionRow = { emoji: string };
type ReplyCountRow = { count: number };
type MyStoryRow = {
  id: string;
  body: string;
  location_label: string | null;
  created_at: string;
  lat: number;
  lng: number;
  is_memory: boolean;
  reactions: ReactionRow[];
  replies: ReplyCountRow[];
};

const SELECT = 'id, body, location_label, created_at, lat, lng, is_memory, reactions(emoji), replies(count)';

export function useMyStories(): UseMyStoriesResult {
  const [stories, setStories] = useState<MyStory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const userId = sessionData.session?.user?.id ?? null;

        if (!userId) {
          if (!cancelled) { setStories([]); setLoading(false); }
          return;
        }

        const { data, error: e } = await supabase
          .from('stories')
          .select(SELECT)
          .eq('author_id', userId)
          .eq('status', 'live')
          .order('created_at', { ascending: false });
        if (e) throw e;

        const rows = (data ?? []) as unknown as MyStoryRow[];
        const mapped: MyStory[] = rows.map((r) => ({
          id: r.id,
          body: r.body,
          location_label: r.location_label,
          created_at: r.created_at,
          reaction_count: r.reactions?.length ?? 0,
          reply_count: r.replies?.[0]?.count ?? 0,
          lat: r.lat,
          lng: r.lng,
          is_memory: r.is_memory ?? false,
        }));

        if (!cancelled) { setStories(mapped); setLoading(false); }
      } catch (e) {
        if (!cancelled) { setError(e as Error); setLoading(false); }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return { stories, loading, error };
}
