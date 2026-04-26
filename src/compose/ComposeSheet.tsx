import { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, Pressable,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import * as Location from 'expo-location';
import { useTheme } from '@/theme/ThemeContext';
import { MOODS } from '@/moods/catalog';
import { useCreateStory } from '@/data/useCreateStory';
import { reverseGeocode } from '@/lib/reverseGeocode';
import type { Mood } from '@/data/types';
import { useUser } from '@/data/useUser';
import { StylePicker } from '@/story/StylePicker';
import { DEFAULT_CARD_STYLE, type CardStyleId } from '@/story/cardStyles';
import { ComposeCard } from './ComposeCard';

export interface ComposeSheetProps {
  /** Pre-filled from double-click. Undefined = use GPS. */
  coords?: { lat: number; lng: number };
  onClose: () => void;
  onPosted?: () => void;
  bottomOffset?: number;
}

export function ComposeSheet({ coords, onClose, onPosted, bottomOffset = 0 }: ComposeSheetProps) {
  const theme = useTheme();
  const create = useCreateStory();

  const [selectedMood, setSelectedMood] = useState<Mood>('on_my_mind');
  const [body, setBody] = useState('');
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(coords ?? null);
  const [placeLabel, setPlaceLabel] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { user } = useUser();
  const [selectedStyle, setSelectedStyle] = useState<CardStyleId>(DEFAULT_CARD_STYLE);

  useEffect(() => {
    if (user?.preferred_card_style) {
      setSelectedStyle(user.preferred_card_style);
    }
  }, [user?.preferred_card_style]);

  // Reverse geocode whenever location resolves
  useEffect(() => {
    if (!location) return;
    reverseGeocode(location.lat, location.lng).then((p) => {
      if (p) setPlaceLabel(p.short);
    });
  }, [location?.lat, location?.lng]);

  useEffect(() => {
    if (coords) return;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      try {
        const { coords: c } = await Location.getCurrentPositionAsync({});
        setLocation({ lat: c.latitude, lng: c.longitude });
      } catch {}
    })();
  }, [coords]);

  const moodEntry = MOODS.find((m) => m.id === selectedMood);
  const canPost = !!location && body.trim().length > 0 && !posting;

  const handlePost = async () => {
    if (!location || !body.trim()) return;
    setPosting(true);
    setError(null);
    try {
      await create({
        mood: selectedMood,
        body: body.trim(),
        coords: location,
        pinMode: coords ? 'dropped' : 'gps',
        label: placeLabel ?? undefined,
        cardStyle: selectedStyle,
      });
      onClose();
      onPosted?.();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
      setPosting(false);
    }
  };

  return (
    <View style={[styles.card, { backgroundColor: theme.surface, bottom: bottomOffset }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.textPrimary, fontFamily: theme.fontFamily }]}>
          New sulat
        </Text>
        <Pressable onPress={onClose} style={styles.closeHitbox}>
          <Text style={[styles.closeTxt, { color: theme.textMuted }]}>✕</Text>
        </Pressable>
      </View>

      {/* Mood picker */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.moodScroll}
        contentContainerStyle={styles.moodRow}
      >
        {MOODS.map((m) => {
          const active = m.id === selectedMood;
          return (
            <Pressable
              key={m.id}
              onPress={() => setSelectedMood(m.id)}
              style={[
                styles.moodChip,
                { backgroundColor: active ? theme.accent : 'rgba(245,230,200,0.08)' },
              ]}
            >
              <Text style={styles.moodEmoji}>{m.emoji}</Text>
              <Text style={[styles.moodName, { color: active ? '#2a1f0a' : theme.textMuted }]}>
                {m.name}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <StylePicker selected={selectedStyle} onSelect={setSelectedStyle} />

      {/* Card editor — write directly on the paper */}
      <ComposeCard
        cardStyle={selectedStyle}
        value={body}
        onChangeText={setBody}
        placeholder={moodEntry?.prompt ?? 'What do you want to say?'}
        locationLabel={placeLabel}
        maxLength={500}
      />
      <Text style={[styles.charCount, { color: theme.textMuted }]}>{body.length}/500</Text>

      {/* Location */}
      <View style={styles.locationRow}>
        <Text style={[styles.locationPin, { color: 'rgba(244,201,122,0.7)' }]}>📍</Text>
        {!location ? (
          <Text style={[styles.locationTxt, { color: 'rgba(244,201,122,0.5)' }]}>Getting location…</Text>
        ) : placeLabel ? (
          <Text style={[styles.locationTxt, { color: 'rgba(244,201,122,0.5)' }]}>{placeLabel}</Text>
        ) : (
          <Text style={[styles.locationTxt, { color: 'rgba(244,201,122,0.5)' }]}>
            {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
          </Text>
        )}
      </View>

      {error ? <Text style={styles.errorTxt}>{error}</Text> : null}

      {/* Post button */}
      <Pressable
        onPress={handlePost}
        disabled={!canPost}
        style={[styles.postBtn, { backgroundColor: canPost ? theme.accent : 'rgba(244,201,122,0.3)' }]}
      >
        {posting
          ? <ActivityIndicator color="#2a1f0a" />
          : <Text style={styles.postBtnTxt}>Post sulat</Text>}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    elevation: 12,
    left: 12,
    paddingBottom: 16,
    paddingHorizontal: 16,
    paddingTop: 14,
    position: 'absolute',
    right: 12,
    shadowColor: '#1a0e00',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
  },
  charCount: { fontSize: 11, marginBottom: 10, textAlign: 'right' },
  closeHitbox: { marginLeft: 'auto', padding: 4 },
  closeTxt: { fontSize: 14 },
  errorTxt: { color: '#ff8a8a', fontSize: 12, marginBottom: 8 },
  header: { alignItems: 'center', flexDirection: 'row', marginBottom: 12 },
  headerTitle: { fontSize: 17, fontWeight: '500' },
  locationPin: { fontSize: 11, marginRight: 4 },
  locationRow: { alignItems: 'center', flexDirection: 'row', marginBottom: 12 },
  locationTxt: { fontSize: 12 },
  moodChip: {
    alignItems: 'center',
    borderRadius: 20,
    flexDirection: 'row',
    gap: 5,
    marginRight: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  moodEmoji: { fontSize: 14 },
  moodName: { fontSize: 12, fontWeight: '500' },
  moodRow: { paddingBottom: 2, paddingRight: 8 },
  moodScroll: { marginBottom: 12 },
  postBtn: {
    alignItems: 'center',
    borderRadius: 14,
    height: 44,
    justifyContent: 'center',
  },
  postBtnTxt: { color: '#2a1f0a', fontSize: 15, fontWeight: '600' },
});
