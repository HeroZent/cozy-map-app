import { Stack } from 'expo-router';
import { ThemeProvider } from '@/theme/ThemeContext';
import { useUser } from '@/data/useUser';

// Handwritten card fonts are loaded via <link> in public/index.html (Google Fonts CDN).
// This keeps ~400 KB of font data out of the JS bundle.
// If native builds are added later, restore useFonts() here with a Platform.OS check.

function UserInit() {
  useUser(); // initialises anonymous auth session on first load
  return null;
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <UserInit />
      <Stack screenOptions={{ headerShown: false }} />
    </ThemeProvider>
  );
}
