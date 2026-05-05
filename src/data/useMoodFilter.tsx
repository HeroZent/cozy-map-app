import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { kvGet, kvSet } from '@/lib/persistence';
import { MOODS } from '@/moods/catalog';
import type { Mood } from '@/data/types';

const MOODS_KEY = 'sulat.filters.moods';
const OVERRIDE_KEY = 'sulat.filters.moodsOverride';

const ALL_MOOD_IDS: Mood[] = MOODS.map((m) => m.id);

export interface MoodFilterAPI {
  /**
   * Override-aware Set of moods the user wants visible.
   * - When the user has not overridden the default, this returns ALL moods
   *   (so future-added moods are visible automatically).
   * - When the user has toggled or reset, this returns the explicit selection.
   */
  selectedMoods: Set<Mood>;
  /** True from mount until persisted state has been read. */
  hydrating: boolean;
  /** Whether the user has ever explicitly chosen a mood selection. */
  hasOverride: boolean;
  /** Add or remove a single mood from the selection. Persists. */
  toggle: (mood: Mood) => Promise<void>;
  /** Re-show all moods (filter off). Clears the override flag. Persists. */
  reset: () => Promise<void>;
}

function safeParseMoodArray(json: string | null): Mood[] {
  if (!json) return [];
  try {
    const v = JSON.parse(json);
    if (Array.isArray(v)) {
      return v.filter((x): x is Mood =>
        typeof x === 'string' && (ALL_MOOD_IDS as string[]).includes(x)
      );
    }
  } catch {
    // fall through
  }
  return [];
}

const MoodFilterContext = createContext<MoodFilterAPI | null>(null);

export function MoodFilterProvider({ children }: { children: ReactNode }) {
  const [userSelectedMoods, setUserSelectedMoods] = useState<Set<Mood>>(() => new Set());
  const [hasOverride, setHasOverride] = useState(false);
  const [hydrating, setHydrating] = useState(true);

  const userSelectedRef = useRef<Set<Mood>>(userSelectedMoods);
  const hasOverrideRef = useRef(hasOverride);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [overrideJson, moodsJson] = await Promise.all([
        kvGet(OVERRIDE_KEY),
        kvGet(MOODS_KEY),
      ]);
      if (cancelled) return;
      const override = overrideJson === 'true';
      const userSet = new Set<Mood>(safeParseMoodArray(moodsJson));
      userSelectedRef.current = userSet;
      hasOverrideRef.current = override;
      setUserSelectedMoods(userSet);
      setHasOverride(override);
      setHydrating(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Override-aware computed Set: when no override, treat as all moods visible.
  const selectedMoods = useMemo<Set<Mood>>(() => {
    return hasOverride ? userSelectedMoods : new Set(ALL_MOOD_IDS);
  }, [hasOverride, userSelectedMoods]);

  const toggle = useCallback(async (mood: Mood) => {
    // First override starts from the all-selected baseline so unchecking ONE
    // mood doesn't accidentally hide everything.
    const baseline = hasOverrideRef.current
      ? new Set(userSelectedRef.current)
      : new Set<Mood>(ALL_MOOD_IDS);
    if (baseline.has(mood)) baseline.delete(mood);
    else baseline.add(mood);

    userSelectedRef.current = baseline;
    hasOverrideRef.current = true;
    setUserSelectedMoods(baseline);
    setHasOverride(true);

    await Promise.all([
      kvSet(OVERRIDE_KEY, 'true'),
      kvSet(MOODS_KEY, JSON.stringify(Array.from(baseline))),
    ]);
  }, []);

  const reset = useCallback(async () => {
    const empty = new Set<Mood>();
    userSelectedRef.current = empty;
    hasOverrideRef.current = false;
    setUserSelectedMoods(empty);
    setHasOverride(false);

    await Promise.all([
      kvSet(OVERRIDE_KEY, 'false'),
      kvSet(MOODS_KEY, JSON.stringify([])),
    ]);
  }, []);

  const value: MoodFilterAPI = {
    selectedMoods,
    hydrating,
    hasOverride,
    toggle,
    reset,
  };

  return <MoodFilterContext.Provider value={value}>{children}</MoodFilterContext.Provider>;
}

export function useMoodFilter(): MoodFilterAPI {
  const ctx = useContext(MoodFilterContext);
  if (!ctx) {
    throw new Error('useMoodFilter must be used inside <MoodFilterProvider>');
  }
  return ctx;
}
