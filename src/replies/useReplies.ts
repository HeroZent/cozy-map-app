// src/replies/useReplies.ts
import { useState } from 'react';
import { supabase } from '@/data/supabase';

export interface Reply {
  id: string;
  body: string;
  created_at: string;
  author_id: string;
  display_handle: string | null;
}

export interface UseRepliesResult {
  replies: Reply[];
  loading: boolean;
  error: Error | null;
  fetch: () => Promise<void>;
}

type ReplyRow = {
  id: string;
  body: string;
  created_at: string;
  author_id: string;
  users: { display_handle: string | null } | null;
};

export function useReplies(storyId: string): UseRepliesResult {
  const [replies, setReplies] = useState<Reply[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetch = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: e } = await supabase
        .from('replies')
        .select('id, body, created_at, author_id, users(display_handle)')
        .eq('story_id', storyId)
        .eq('status', 'live')
        .order('created_at', { ascending: true });
      if (e) throw e;
      const rows = (data ?? []) as unknown as ReplyRow[];
      setReplies(
        rows.map((r) => ({
          id: r.id,
          body: r.body,
          created_at: r.created_at,
          author_id: r.author_id,
          display_handle: r.users?.display_handle ?? null,
        })),
      );
    } catch (e) {
      setError(e as Error);
    } finally {
      setLoading(false);
    }
  };

  return { replies, loading, error, fetch };
}
