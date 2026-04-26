export interface SulatTheme {
  id: string;
  name: string;
  description: string;
  mapStyle: string;
  background: string;
  surface: string;
  textPrimary: string;
  textMuted: string;
  accent: string;
  fontFamily: string;
  pin: { glow: string; body: string; pulseDuration: number };
  pinMemory: { glow: string; body: string; decoration: string };
  heatmap: { offset: number; color: string }[];
  reactionTint: string;
}
