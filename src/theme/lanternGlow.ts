import type { SulatTheme } from './types';

export const lanternGlow: SulatTheme = {
  id: 'lantern-glow',
  name: 'Lantern Glow',
  description: 'Warm amber lights on a deep navy night map',
  mapStyle: 'https://tiles.openfreemap.org/styles/dark',
  background: '#0a0e22',
  surface: '#141a3a',
  textPrimary: '#f5e6c8',
  textMuted: 'rgba(245, 230, 200, 0.65)',
  accent: '#f4c97a',
  fontFamily: 'Georgia, serif',
  pin: {
    glow: 'rgba(244, 201, 122, 0.7)',
    body: '#f4c97a',
    pulseDuration: 3500,
  },
  pinMemory: {
    glow: 'rgba(208, 184, 255, 0.6)',
    body: '#d0b8ff',
    decoration: '✦',
  },
  heatmap: [
    { offset: 0, color: 'rgba(244, 201, 122, 0)' },
    { offset: 0.4, color: 'rgba(244, 201, 122, 0.4)' },
    { offset: 0.8, color: 'rgba(232, 140, 90, 0.7)' },
    { offset: 1, color: 'rgba(180, 90, 160, 0.85)' },
  ],
  reactionTint: '#f4c97a',
};
