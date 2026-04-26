import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import * as Location from 'expo-location';
import { useTheme } from '@/theme/ThemeContext';
import type { LatLng } from '@/lib/geo';

export interface LocationGPSProps {
  onPick: (loc: LatLng) => void;
}

export function LocationGPS({ onPick }: LocationGPSProps) {
  const theme = useTheme();
  const [status, setStatus] = useState<'idle' | 'asking' | 'denied' | 'got'>('idle');
  const [coords, setCoords] = useState<LatLng | null>(null);

  const getLocation = async () => {
    setStatus('asking');
    const { status: perm } = await Location.requestForegroundPermissionsAsync();
    if (perm !== 'granted') {
      setStatus('denied');
      return;
    }
    const { coords: c } = await Location.getCurrentPositionAsync({});
    setCoords({ lat: c.latitude, lng: c.longitude });
    setStatus('got');
  };

  return (
    <View style={styles.wrap}>
      {status === 'idle' && (
        <Pressable onPress={getLocation} style={[styles.btn, { backgroundColor: theme.accent }]}>
          <Text style={styles.btnTxt}>Use my current location</Text>
        </Pressable>
      )}
      {status === 'asking' && <Text style={{ color: theme.textMuted }}>Asking permission…</Text>}
      {status === 'denied' && <Text style={{ color: '#ff8a8a' }}>Permission denied. Try another option.</Text>}
      {status === 'got' && coords && (
        <>
          <Text style={[styles.coords, { color: theme.textPrimary }]}>
            {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
          </Text>
          <Pressable onPress={() => onPick(coords)} style={[styles.btn, { backgroundColor: theme.accent }]}>
            <Text style={styles.btnTxt}>Use this location</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  btn: { borderRadius: 12, paddingHorizontal: 22, paddingVertical: 12 },
  btnTxt: { color: '#2a1f0a', fontWeight: '600' },
  coords: { fontFamily: 'monospace', fontSize: 14 },
  wrap: { alignItems: 'center', gap: 16, padding: 24 },
});
