import type { SulatTheme } from './types';

export const lanternGlow: SulatTheme = {
  id: 'lantern-glow',
  name: 'Lantern Glow',
  description: 'Warm amber lights on a deep navy night map',
  mapStyle: 'https://tiles.openfreemap.org/styles/dark',

  /* ── Background layers ─ */
  background:      '#0a0e22',
  surface:         '#141a3a',
  surfaceElevated: '#1c2348',
  surfaceMuted:    '#10142a',

  /* ── Borders ─ */
  border:     'rgba(244, 201, 122, 0.13)',
  borderSoft: 'rgba(244, 201, 122, 0.06)',

  /* ── Text ─ */
  textPrimary: '#f5e6c8',
  textMuted:   'rgba(245, 230, 200, 0.65)',
  textFaint:   'rgba(245, 230, 200, 0.38)',

  /* ── Accent + states ─ */
  accent:        '#f4c97a',
  accentMuted:   'rgba(244, 201, 122, 0.7)',
  accentDim:     'rgba(244, 201, 122, 0.08)',
  accentSoft:    'rgba(244, 201, 122, 0.18)',
  accentPressed: '#e8b85e',

  fontFamily: 'Georgia, serif',

  pin:       { glow: 'rgba(244, 201, 122, 0.7)', body: '#f4c97a',  pulseDuration: 3500 },
  pinMemory: { glow: 'rgba(208, 184, 255, 0.6)', body: '#d0b8ff', decoration: '✦' },

  heatmap: [
    { offset: 0,   color: 'rgba(244, 201, 122, 0)'    },
    { offset: 0.4, color: 'rgba(244, 201, 122, 0.4)'  },
    { offset: 0.8, color: 'rgba(232, 140, 90, 0.7)'   },
    { offset: 1,   color: 'rgba(180, 90, 160, 0.85)'  },
  ],

  reactionTint: '#f4c97a',

  /* ── Mood palette ─ */
  moods: {
    memory:        '#a8b8ff',
    regret:        '#d4836f',
    on_my_mind:    '#f4c97a',
    struggling:    '#e07b54',
    hopeful:       '#a3d9b1',
    dream:         '#d0b8ff',
    unsent_letter: '#a4cad9',
    forgiveness:   '#e8c99d',
  },

  /* ── Radii ─ */
  radii: {
    sm:   8,
    md:   12,
    lg:   16,
    xl:   24,
    full: 9999,
  },

  /* ── Elevations ─ */
  elevations: {
    sm: {
      shadowColor:   '#000',
      shadowOffset:  { width: 0, height: 1 },
      shadowOpacity: 0.32,
      shadowRadius:  3,
      elevation:     2,
    },
    md: {
      shadowColor:   '#000',
      shadowOffset:  { width: 0, height: 6 },
      shadowOpacity: 0.42,
      shadowRadius:  12,
      elevation:     8,
    },
    lg: {
      shadowColor:   '#000',
      shadowOffset:  { width: 0, height: 14 },
      shadowOpacity: 0.55,
      shadowRadius:  24,
      elevation:     16,
    },
    glow: {
      shadowColor:   '#f4c97a',
      shadowOffset:  { width: 0, height: 0 },
      shadowOpacity: 0.55,
      shadowRadius:  20,
      elevation:     10,
    },
  },
};
