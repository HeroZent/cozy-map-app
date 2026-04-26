import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { LocationGPS } from './LocationGPS';
import { LocationDropPin } from './LocationDropPin';
import { LocationCity } from './LocationCity';
import type { LatLng } from '@/lib/geo';
import type { PinMode } from '@/data/types';

export interface PickedLocation {
  coords: LatLng;
  pinMode: PinMode;
  label?: string;
}

export interface LocationPickerProps {
  onPick: (loc: PickedLocation) => void;
}

type Tab = 'gps' | 'drop' | 'city';

export function LocationPicker({ onPick }: LocationPickerProps) {
  const theme = useTheme();
  const [tab, setTab] = useState<Tab>('gps');

  return (
    <View style={[styles.wrap, { backgroundColor: theme.background }]}>
      <Text style={[styles.title, { color: theme.textPrimary, fontFamily: theme.fontFamily }]}>
        Where does this story live?
      </Text>
      <View style={styles.tabs}>
        {(['gps', 'drop', 'city'] as const).map((t) => (
          <Pressable
            key={t}
            onPress={() => setTab(t)}
            style={[styles.tab, { borderColor: tab === t ? theme.accent : 'transparent' }]}
          >
            <Text style={[styles.tabTxt, { color: theme.textPrimary }]}>
              {t === 'gps' ? '📍 My location' : t === 'drop' ? '🗺️ Drop a pin' : '🏙️ Pick a city'}
            </Text>
          </Pressable>
        ))}
      </View>
      {tab === 'gps' && <LocationGPS onPick={(c) => onPick({ coords: c, pinMode: 'gps' })} />}
      {tab === 'drop' && <LocationDropPin onPick={(c) => onPick({ coords: c, pinMode: 'dropped' })} />}
      {tab === 'city' && <LocationCity onPick={(c, label) => onPick({ coords: c, pinMode: 'city', label })} />}
    </View>
  );
}

const styles = StyleSheet.create({
  tab: { borderRadius: 18, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8 },
  tabTxt: { fontSize: 12, fontWeight: '600' },
  tabs: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  title: { fontSize: 22, marginBottom: 18 },
  wrap: { flex: 1, padding: 16, paddingTop: 60 },
});
