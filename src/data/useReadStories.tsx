import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { kvGet, kvSet } from '@/lib/persistence';

const READ_KEY = 'sulat.read';
const STARRED_KEY = 'sulat.starred';

export interface ReadStoriesAPI {
  /** IDs of stories the user has opened. */
  read: Set<string>;
  /** IDs of stories the user has starred. */
  starred: Set<string>;
  /** True from mount until both sets have been read from persistence. */
  hydrating: boolean;
  isRead: (id: string) => boolean;
  isStarred: (id: string) => boolean;
  /** Marks a story as read. Idempotent. Persists to kv. */
  markRead: (id: string) => Promise<void>;
  /** Adds or removes a story from the starred set. Persists to kv. */
  toggleStarred: (id: string) => Promise<void>;
}

function safeParseIdArray(json: string | null): string[] {
  if (!json) return [];
  try {
    const v = JSON.parse(json);
    if (Array.isArray(v)) return v.filter((x): x is string => typeof x === 'string');
  } catch {
    // fall through
  }
  return [];
}

const ReadStoriesContext = createContext<ReadStoriesAPI | null>(null);

/**
 * Provider that owns the singleton read + starred state for the whole app.
 * Mount once, near the root. All consumers (StorySheet, StarToggle, StoryPins,
 * app/index.tsx) read from the same source so a markRead in one component
 * propagates to every other consumer's render.
 */
export function ReadStoriesProvider({ children }: { children: ReactNode }) {
  const [read, setRead] = useState<Set<string>>(() => new Set());
  const [starred, setStarred] = useState<Set<string>>(() => new Set());
  const [hydrating, setHydrating] = useState(true);

  // Refs mirror state so callbacks always see current values without stale closures.
  const readRef = useRef<Set<string>>(read);
  const starredRef = useRef<Set<string>>(starred);

  // Hydrate once on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [readJson, starredJson] = await Promise.all([
        kvGet(READ_KEY),
        kvGet(STARRED_KEY),
      ]);
      if (cancelled) return;
      const r = new Set(safeParseIdArray(readJson));
      const s = new Set(safeParseIdArray(starredJson));
      readRef.current = r;
      starredRef.current = s;
      setRead(r);
      setStarred(s);
      setHydrating(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const markRead = useCallback(async (id: string) => {
    const prev = readRef.current;
    if (prev.has(id)) return;
    const next = new Set(prev);
    next.add(id);
    readRef.current = next;
    setRead(next);
    await kvSet(READ_KEY, JSON.stringify(Array.from(next)));
  }, []);

  const toggleStarred = useCallback(async (id: string) => {
    const prev = starredRef.current;
    const next = new Set(prev);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    starredRef.current = next;
    setStarred(next);
    await kvSet(STARRED_KEY, JSON.stringify(Array.from(next)));
  }, []);

  const isRead = useCallback((id: string) => read.has(id), [read]);
  const isStarred = useCallback((id: string) => starred.has(id), [starred]);

  const value: ReadStoriesAPI = { read, starred, hydrating, isRead, isStarred, markRead, toggleStarred };

  return <ReadStoriesContext.Provider value={value}>{children}</ReadStoriesContext.Provider>;
}

/**
 * Returns the singleton read/starred state. Must be called inside <ReadStoriesProvider />.
 */
export function useReadStories(): ReadStoriesAPI {
  const ctx = useContext(ReadStoriesContext);
  if (!ctx) {
    throw new Error('useReadStories must be used inside <ReadStoriesProvider>');
  }
  return ctx;
}
