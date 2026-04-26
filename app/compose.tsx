import { useLocalSearchParams } from 'expo-router';
import { ComposerScreen } from '@/compose/ComposerScreen';
import type { PickedLocation } from '@/compose/LocationPicker';

export default function Compose() {
  const { lat, lng } = useLocalSearchParams<{ lat?: string; lng?: string }>();

  const initialLocation: PickedLocation | undefined =
    lat && lng
      ? { coords: { lat: parseFloat(lat), lng: parseFloat(lng) }, pinMode: 'dropped' }
      : undefined;

  return <ComposerScreen initialLocation={initialLocation} />;
}
