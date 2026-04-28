export interface ShadowToken {
  shadowColor: string;
  shadowOffset: { width: number; height: number };
  shadowOpacity: number;
  shadowRadius: number;
  elevation: number;
}

export interface SulatTheme {
  id: string;
  name: string;
  description: string;
  mapStyle: string;

  /* ── Background layers ──────────────────── */
  background: string;
  surface: string;
  /** Slightly raised surface — for stacked cards inside sheets */
  surfaceElevated: string;
  /** Subtle / muted surface — for dividers, recessed elements */
  surfaceMuted: string;

  /* ── Borders ────────────────────────────── */
  border: string;
  borderSoft: string;

  /* ── Text hierarchy ─────────────────────── */
  textPrimary: string;
  textMuted: string;
  textFaint: string;

  /* ── Accent + interaction states ────────── */
  accent: string;
  accentMuted: string;
  /** Very subtle accent tint (e.g. selected row background) */
  accentDim: string;
  /** Slightly stronger accent tint (e.g. active tab) */
  accentSoft: string;
  /** Color when an accent surface is being pressed */
  accentPressed: string;

  fontFamily: string;

  pin: { glow: string; body: string; pulseDuration: number };
  pinMemory: { glow: string; body: string; decoration: string };
  heatmap: { offset: number; color: string }[];
  reactionTint: string;

  /* ── Mood palette (for pins, reactions, mood pills) ─ */
  moods: {
    memory: string;
    regret: string;
    on_my_mind: string;
    struggling: string;
    hopeful: string;
    dream: string;
    unsent_letter: string;
    forgiveness: string;
  };

  /* ── Radii system ────────────────────────── */
  radii: {
    sm: number;
    md: number;
    lg: number;
    xl: number;
    full: number;
  };

  /* ── Elevation / shadow tokens ───────────── */
  elevations: {
    sm: ShadowToken;
    md: ShadowToken;
    lg: ShadowToken;
    /** Soft accent-colored glow — for FAB and emphasized elements */
    glow: ShadowToken;
  };
}
