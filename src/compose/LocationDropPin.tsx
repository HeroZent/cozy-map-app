import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Map, { Marker } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useTheme } from '@/theme/ThemeContext';
import type { LatLng } from '@/lib/geo';

export interface LocationDropPinProps {
  onPick: (loc: LatLng) => void;
}

export function LocationDropPin({ onPick }: LocationDropPinProps) {
  const theme = useTheme();
  const [center, setCenter] = useState<LatLng>({ lat: 14.5995, lng: 120.9842 });

  return (
    <View style={styles.wrap}>
      <View style={styles.mapBox}>
        <Map
          initialViewState={{ longitude: center.lng, latitude: center.lat, zoom: 6 }}
          mapStyle={theme.mapStyle}
          // eslint-disable-next-line react-native/no-inline-styles
          style={{ height: '100%', width: '100%' }}
          onMove={(e) => setCenter({ lat: e.viewState.latitude, lng: e.viewState.longitude })}
        >
          <Marker longitude={center.lng} latitude={center.lat} anchor="center">
            <View style={[styles.pin, { backgroundColor: theme.accent }]} />
          </Marker>
        </Map>
      </View>
      <Pressable onPress={() => onPick(center)} style={[styles.btn, { backgroundColor: theme.accent }]}>
        <Text style={styles.btnTxt}>Drop pin here</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  btn: { alignItems: 'center', borderRadius: 12, padding: 12 },
  btnTxt: { color: '#2a1f0a', fontWeight: '600' },
  mapBox: { borderRadius: 12, height: 320, overflow: 'hidden' },
  pin: { borderRadius: 9, height: 18, width: 18 },
  wrap: { gap: 12, padding: 16 },
});
