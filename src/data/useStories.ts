import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import type { Story } from './types';

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

type StoryRow = Omit<Story, 'location'> & { location?: { type: 'Point'; coordinates: [number, number] } };

function inBbox(s: StoryRow, bbox: Bbox): boolean {
  const coords = s.location?.coordinates;
  const lng = coords?.[0];
  const lat = coords?.[1];
  return (
    typeof lng === 'number' && typeof lat === 'number' &&
    lng >= bbox.minLng && lng <= bbox.maxLng &&
    lat >= bbox.minLat && lat <= bbox.maxLat
  );
}

export function useStories(bbox: Bbox): UseStoriesResult {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const { data, error: e } = await supabase
          .from('stories')
          .select('id, author_id, mood, body, location_label, pin_mode, language, status, is_memory, created_at, location:location::json')
          .eq('status', 'live')
          .order('created_at', { ascending: false })
          .limit(500);
        if (e) throw e;

        const rows = (data ?? []) as StoryRow[];
        const filtered = rows.filter((s) => inBbox(s, bbox)) as Story[];

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

    // Unique name per mount so React Strict Mode double-invoke doesn't hit an already-subscribed channel
    const channelName = `stories-live-${Math.random().toString(36).slice(2)}`;
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'stories', filter: 'status=eq.live' },
          (payload) => {
            const inserted = payload.new as { id: string };
            (async () => {
              const { data } = await supabase
                .from('stories')
                .select('id, author_id, mood, body, location_label, pin_mode, language, status, is_memory, created_at, location:location::json')
                .eq('id', inserted.id)
                .single();
              if (data) {
                const row = data as StoryRow;
                if (inBbox(row, bbox)) {
                  setStories((prev) => [data as Story, ...prev]);
                }
              }
            })();
          })
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [bbox.minLng, bbox.minLat, bbox.maxLng, bbox.maxLat]);

  return { stories, loading, error };
}
