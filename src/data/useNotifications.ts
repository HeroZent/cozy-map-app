// src/data/useNotifications.ts
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/data/supabase';

export interface Notification {
  id: string;
  type: 'memory_promoted' | 'new_reply' | 'new_reaction';
  story_id: string | null;
  payload: Record<string, unknown>;
  created_at: string;
  // Joined from stories — null when the story has been deleted.
  stories: {
    body: string;
    location_label: string | null;
    lat: number;
    lng: number;
    created_at: string;
  } | null;
}

export interface UseNotificationsResult {
  notifications: Notification[];
  memoryCount: number;
  activityCount: number;
  activityNotificationIds: string[];
  markRead: (ids: string[]) => Promise<void>;
  loading: boolean;
}

// Raw shape returned from the DB — cast target before mapping to Notification
interface NotificationRow {
  id: string;
  type: string;
  story_id: string | null;
  payload: Record<string, unknown>;
  created_at: string;
  stories: {
    body: string;
    location_label: string | null;
    lat: number;
    lng: number;
    created_at: string;
  } | null;
}

const SELECT = `
  id, type, story_id, payload, created_at,
  stories ( body, location_label, lat, lng, created_at )
`;

function mapRows(data: NotificationRow[]): Notification[] {
  return data.map((r) => ({
    ...r,
    type: r.type as Notification['type'],
  }));
}

export function useNotifications(): UseNotificationsResult {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);
  // Captured so markRead can add a user filter as defense-in-depth (RLS is the primary guard)
  const userIdRef = useRef<string | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    let cancelled = false;
    (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user?.id ?? null;
      userIdRef.current = userId;

      if (!userId) {
        if (!cancelled) setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('notifications')
        .select(SELECT)
        .is('read_at', null)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('[useNotifications] fetch error:', error.message);
        if (!cancelled) setLoading(false);
        return; // fail open — memoryCount stays 0, banner stays hidden
      }

      if (!cancelled) {
        setNotifications(mapRows((data ?? []) as NotificationRow[]));
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      mountedRef.current = false;
    };
  }, []);

  const markRead = async (ids: string[]) => {
    if (ids.length === 0) return;
    const userId = userIdRef.current;
    if (!userId) return;
    // Optimistic: update local state immediately
    setNotifications((prev) => prev.filter((n) => !ids.includes(n.id)));
    // Patch DB in background — fire and forget.
    // .eq('user_id', userId) is defense-in-depth; RLS is the primary guard.
    supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', userId)
      .in('id', ids)
      .then(({ error }) => {
        if (error) {
          console.error('[useNotifications] markRead error:', error.message);
          // On error, silently re-fetch to restore correct state
          supabase
            .from('notifications')
            .select(SELECT)
            .is('read_at', null)
            .order('created_at', { ascending: false })
            .limit(20)
            .then(({ data }) => {
              if (mountedRef.current) {
                setNotifications(mapRows((data ?? []) as NotificationRow[]));
              }
            });
        }
      });
  };

  const memoryCount = notifications.filter((n) => n.type === 'memory_promoted').length;

  const activityNotifs = notifications.filter(
    (n) => n.type === 'new_reply' || n.type === 'new_reaction',
  );
  const activityCount = activityNotifs.length;
  const activityNotificationIds = activityNotifs.map((n) => n.id);

  return { notifications, memoryCount, activityCount, activityNotificationIds, markRead, loading };
}
