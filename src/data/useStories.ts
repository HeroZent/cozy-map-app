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

        const inBbox = (data ?? []).filter((s: any) => {
          const coords = s.location?.coordinates as [number, number] | undefined;
          const lng = coords?.[0];
          const lat = coords?.[1];
          return (
            typeof lng === 'number' && typeof lat === 'number' &&
            lng >= bbox.minLng && lng <= bbox.maxLng &&
            lat >= bbox.minLat && lat <= bbox.maxLat
          );
        }) as Story[];

        if (!cancelled) {
          setStories(inBbox);
          setLoading(false);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e as Error);
          setLoading(false);
        }
      }
    })();

    // Realtime subscription — push new live stories into the list
    const channel = supabase
      .channel('stories-live')
      .on('postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'stories', filter: 'status=eq.live' },
          (payload) => {
            const s = payload.new as any;
            (async () => {
              const { data } = await supabase
                .from('stories')
                .select('id, author_id, mood, body, location_label, pin_mode, language, status, is_memory, created_at, location:location::json')
                .eq('id', s.id)
                .single();
              if (data) {
                const coords = (data as any).location?.coordinates as [number, number] | undefined;
                const lng = coords?.[0];
                const lat = coords?.[1];
                if (
                  typeof lng === 'number' && typeof lat === 'number' &&
                  lng >= bbox.minLng && lng <= bbox.maxLng &&
                  lat >= bbox.minLat && lat <= bbox.maxLat
                ) {
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
