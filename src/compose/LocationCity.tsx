import { View, Text } from 'react-native';
import type { LatLng } from '@/lib/geo';

export interface LocationCityProps {
  onPick: (loc: LatLng, label: string) => void;
}

export function LocationCity({ onPick: _onPick }: LocationCityProps) {
  return <View><Text>City search loading…</Text></View>;
}
