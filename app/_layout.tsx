import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import { Kalam_400Regular } from '@expo-google-fonts/kalam';
import { Caveat_400Regular } from '@expo-google-fonts/caveat';
import { DancingScript_400Regular } from '@expo-google-fonts/dancing-script';
import { PatrickHand_400Regular } from '@expo-google-fonts/patrick-hand';
import { ReenieBeanie_400Regular } from '@expo-google-fonts/reenie-beanie';
import { ThemeProvider } from '@/theme/ThemeContext';
import { useUser } from '@/data/useUser';

function UserInit() {
  useUser(); // initialises anonymous auth session on first load
  return null;
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Kalam_400Regular,
    Caveat_400Regular,
    DancingScript_400Regular,
    PatrickHand_400Regular,
    ReenieBeanie_400Regular,
  });

  if (!fontsLoaded) return null;

  return (
    <ThemeProvider>
      <UserInit />
      <Stack screenOptions={{ headerShown: false }} />
    </ThemeProvider>
  );
}
