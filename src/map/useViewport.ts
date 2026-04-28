import { useEffect, useSyncExternalStore } from 'react';
import { kvGet, kvSet } from '@/lib/persistence';

const KEY = 'sulat.viewport';
const DEFAULT_VIEWPORT: Viewport = { longitude: 122.5, latitude: 12.5, zoom: 5 };

export interface Viewport {
  longitude: number;
  latitude: number;
  zoom: number;
}

/**
 * Module-level singleton store. Every call to `useViewport()` reads from
 * (and writes to) the SAME state, so when MapView updates the viewport on
 * moveEnd, every other consumer (StoryPins, app/index.tsx) sees the change.
 *
 * Previously useViewport used a per-call useState — multiple consumers got
 * independent React state, and downstream components stayed frozen at the
 * initial zoom no matter how the map moved. That broke clustering, since
 * useClusters would re-run with stale zoom forever.
 */
let currentViewport: Viewport = DEFAULT_VIEWPORT;
let isLoaded = false;
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notify(): void {
  for (const l of listeners) l();
}

function getSnapshot(): Viewport {
  return currentViewport;
}

function getLoadedSnapshot(): boolean {
  return isLoaded;
}

/** Server-side and during static generation we can't have a window —
 *  return the default snapshot synchronously. */
function getServerSnapshot(): Viewport {
  return DEFAULT_VIEWPORT;
}

function getServerLoadedSnapshot(): boolean {
  return false;
}

/** Load persisted viewport once per session (idempotent). */
let loadPromise: Promise<void> | null = null;
function ensureLoaded(): void {
  if (isLoaded || loadPromise) return;
  loadPromise = (async () => {
    const raw = await kvGet(KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Viewport;
        if (typeof parsed.longitude === 'number') {
          currentViewport = parsed;
        }
      } catch {
        /* ignore corrupt value */
      }
    }
    isLoaded = true;
    notify();
  })();
}

/** Update the viewport — fires every subscriber so all consumers re-render. */
export function setViewport(next: Viewport): void {
  currentViewport = next;
  notify();
  // Persist asynchronously; failures are non-fatal.
  kvSet(KEY, JSON.stringify(next)).catch(() => {});
}

export interface UseViewportResult {
  viewport: Viewport;
  setViewport: (v: Viewport) => void;
  loaded: boolean;
}

export function useViewport(): UseViewportResult {
  // Trigger one-time load on first hook usage.
  useEffect(() => {
    ensureLoaded();
  }, []);

  const viewport = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const loaded = useSyncExternalStore(subscribe, getLoadedSnapshot, getServerLoadedSnapshot);

  return { viewport, setViewport, loaded };
}
