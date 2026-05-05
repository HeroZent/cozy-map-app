import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
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

const UnreadFilterContext = createContext<UnreadFilterAPI | null>(null);

export function UnreadFilterProvider({ children }: { children: ReactNode }) {
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [hydrating, setHydrating] = useState(true);
  const unreadOnlyRef = useRef(false);

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

  const value: UnreadFilterAPI = { unreadOnly, hydrating, toggle };

  return <UnreadFilterContext.Provider value={value}>{children}</UnreadFilterContext.Provider>;
}

export function useUnreadFilter(): UnreadFilterAPI {
  const ctx = useContext(UnreadFilterContext);
  if (!ctx) {
    throw new Error('useUnreadFilter must be used inside <UnreadFilterProvider>');
  }
  return ctx;
}
