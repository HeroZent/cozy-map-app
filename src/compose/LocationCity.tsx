import { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { geocodeCity, type CityResult } from '@/lib/geo';
import type { LatLng } from '@/lib/geo';

export interface LocationCityProps {
  onPick: (loc: LatLng, label: string) => void;
}

export function LocationCity({ onPick }: LocationCityProps) {
  const theme = useTheme();
  const [q, setQ] = useState('');
  const [results, setResults] = useState<CityResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    const ctrl = new AbortController();
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const r = await geocodeCity(q, ctrl.signal);
        setResults(r);
      } catch {
        /* ignore aborted */
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => {
      ctrl.abort();
      clearTimeout(t);
    };
  }, [q]);

  return (
    <View style={styles.wrap}>
      <TextInput
        value={q}
        onChangeText={setQ}
        placeholder="Search for a city…"
        placeholderTextColor={theme.textMuted}
        style={[styles.input, { borderColor: theme.surface, color: theme.textPrimary }]}
      />
      {loading && <ActivityIndicator color={theme.accent} style={{ marginTop: 12 }} />}
      <View style={styles.results}>
        {results.map((r, i) => (
          <Pressable
            key={`${r.label}-${i}`}
            onPress={() => onPick({ lat: r.lat, lng: r.lng }, r.label)}
            style={[styles.result, { backgroundColor: theme.surface }]}
          >
            <Text style={[styles.resultTxt, { color: theme.textPrimary }]}>{r.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  input: { borderRadius: 12, borderWidth: 1, fontSize: 15, padding: 12 },
  result: { borderRadius: 12, padding: 14 },
  results: { gap: 8, marginTop: 12 },
  resultTxt: { fontSize: 14 },
  wrap: { padding: 16 },
});
