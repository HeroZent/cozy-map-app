import { useCallback, useEffect, useRef, useState } from 'react';
import { kvGet, kvSet } from '@/lib/persistence';

const FILTER_KEY = 'sulat.filters.unreadOnly';

export interface UnreadFilterAPI {
  /** When true, the map should hide stories the user has already read. */
  unreadOnly: boolean;
  /** True from mount until persisted state has been read. */
  hydrating: boolean;
  /** Flips unreadOnly and persists. */
  toggle: () => Promise<void>;
}

export function useUnreadFilter(): UnreadFilterAPI {
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [hydrating, setHydrating] = useState(true);
  const unreadOnlyRef = useRef(false);

  // Mirror state into a ref so toggle() reads the latest value
  // synchronously without depending on closure-captured state.
  useEffect(() => {
    unreadOnlyRef.current = unreadOnly;
  }, [unreadOnly]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const v = await kvGet(FILTER_KEY);
      if (cancelled) return;
      const next = v === 'true';
      unreadOnlyRef.current = next;
      setUnreadOnly(next);
      setHydrating(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const toggle = useCallback(async () => {
    const next = !unreadOnlyRef.current;
    unreadOnlyRef.current = next;
    setUnreadOnly(next);
    await kvSet(FILTER_KEY, String(next));
  }, []);

  return { unreadOnly, hydrating, toggle };
}
