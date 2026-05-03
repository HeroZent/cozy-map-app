import { useCallback, useEffect, useRef, useState } from 'react';

const MIN_SHOW_MS = 1200;
const HARD_CAP_MS = 8000;

export interface LoaderGatingState {
  /** Should the loader currently be opaque (true) or fading out (false)? */
  visible: boolean;
  /** Should the loader still exist in the React tree at all? */
  mounted: boolean;
  /** Caller invokes this when its fade-out transition completes; flips mounted=false. */
  onDismissed: () => void;
}

/**
 * Manages the loader's visibility lifecycle:
 *  - visible=true on mount
 *  - visible flips false when (loading is false AND 1200ms have elapsed) OR at 8000ms hard cap
 *  - mounted flips false only after the consumer invokes onDismissed (post-fade)
 */
export function useLoaderGating(loading: boolean): LoaderGatingState {
  const [visible, setVisible] = useState(true);
  const [mounted, setMounted] = useState(true);
  const mountedAt = useRef(Date.now());
  const visibleRef = useRef(true);
  useEffect(() => { visibleRef.current = visible; }, [visible]);

  // Hard cap: dismiss at 8s no matter what.
  useEffect(() => {
    const cap = setTimeout(() => {
      if (visibleRef.current) setVisible(false);
    }, HARD_CAP_MS);
    return () => clearTimeout(cap);
  }, []);

  // Data-gated dismiss: when loading flips false, schedule dismiss respecting the floor.
  useEffect(() => {
    if (loading) return;
    const elapsed = Date.now() - mountedAt.current;
    const wait = Math.max(0, MIN_SHOW_MS - elapsed);
    const t = setTimeout(() => {
      if (visibleRef.current) setVisible(false);
    }, wait);
    return () => clearTimeout(t);
  }, [loading]);

  const onDismissed = useCallback(() => {
    setMounted(false);
  }, []);

  return { visible, mounted, onDismissed };
}
