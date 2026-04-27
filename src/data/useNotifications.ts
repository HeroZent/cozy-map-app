// src/data/useNotifications.ts
import { useState, useEffect } from 'react';
import { supabase } from '@/data/supabase';

export interface Notification {
  id: string;
  type: 'memory_promoted' | 'new_reply' | 'new_reaction';
  story_id: string | null;
  payload: Record<string, unknown>;
  created_at: string;
}

export interface UseNotificationsResult {
  notifications: Notification[];
  memoryCount: number;
  markRead: (ids: string[]) => Promise<void>;
  loading: boolean;
}

const SELECT = 'id, type, story_id, payload, created_at';

export function useNotifications(): UseNotificationsResult {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user?.id ?? null;

      if (!userId) {
        if (!cancelled) setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('notifications')
        .select(SELECT)
        .is('read_at', null);

      if (error) {
        console.error('[useNotifications] fetch error:', error.message);
        if (!cancelled) setLoading(false);
        return; // fail open — memoryCount stays 0, banner stays hidden
      }

      if (!cancelled) {
        setNotifications((data ?? []) as Notification[]);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const markRead = async (ids: string[]) => {
    if (ids.length === 0) return;
    // Optimistic: update local state immediately
    setNotifications((prev) => prev.filter((n) => !ids.includes(n.id)));
    // Patch DB in background — fire and forget
    supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .in('id', ids)
      .then(({ error }) => {
        if (error) {
          console.error('[useNotifications] markRead error:', error.message);
          // On error, silently re-fetch to restore correct state
          supabase
            .from('notifications')
            .select(SELECT)
            .is('read_at', null)
            .then(({ data }) => {
              setNotifications((data ?? []) as Notification[]);
            });
        }
      });
  };

  const memoryCount = notifications.filter((n) => n.type === 'memory_promoted').length;

  return { notifications, memoryCount, markRead, loading };
}
