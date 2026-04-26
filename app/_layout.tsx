import { Stack } from 'expo-router';
import { ThemeProvider } from '@/theme/ThemeContext';
import { useUser } from '@/data/useUser';

function UserInit() {
  useUser(); // initializes anonymous auth session on first load
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
