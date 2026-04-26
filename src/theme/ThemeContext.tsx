import { createContext, useContext, type ReactNode } from 'react';
import { lanternGlow } from './lanternGlow';
import type { SulatTheme } from './types';

const ThemeContext = createContext<SulatTheme>(lanternGlow);

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Plan 1: hardcoded to Lantern Glow. Plan 4 wires up theme switching.
  return <ThemeContext.Provider value={lanternGlow}>{children}</ThemeContext.Provider>;
}

export function useTheme(): SulatTheme {
  return useContext(ThemeContext);
}
