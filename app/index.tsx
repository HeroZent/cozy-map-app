import { View } from 'react-native';
import { MapView } from '@/map/MapView';

export default function Home() {
  return (
    <View style={{ flex: 1 }}>
      <MapView />
    </View>
  );
}
