import { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { useTheme } from '@/theme/ThemeContext';
import { MOODS } from '@/moods/catalog';
import { useCreateStory } from '@/data/useCreateStory';
import { reverseGeocode } from '@/lib/reverseGeocode';
import { AnimatedSheet, type AnimatedSheetRef } from '@/components/AnimatedSheet';
import { PressableScale } from '@/components/PressableScale';
import type { Mood } from '@/data/types';
import { useUser } from '@/data/useUser';
import { StylePicker } from '@/story/StylePicker';
import { DEFAULT_CARD_STYLE, type CardStyleId } from '@/story/cardStyles';
import { ComposeCard } from './ComposeCard';
import { checkCrisis } from '@/moderation/crisisTripwire';
import { HotlineOverlay } from '@/moderation/HotlineOverlay';
import { useBackgroundMusic } from '@/audio/useBackgroundMusic';

const MAX_CHARS = 500;

export interface ComposeSheetProps {
  /** Pre-filled from double-click. Undefined = use GPS. */
  coords?: { lat: number; lng: number };
  onClose: () => void;
  onPosted?: () => void;
  bottomOffset?: number;
}

export function ComposeSheet({ coords, onClose, onPosted, bottomOffset = 0 }: ComposeSheetProps) {
  const theme = useTheme();
  const sheetRef = useRef<AnimatedSheetRef>(null);
  const create = useCreateStory();
  const bgMusic = useBackgroundMusic();

  // Duck background music while the sheet is open so the user can think.
  useEffect(() => {
    bgMusic.duck();
    return () => bgMusic.unduck();
  }, [bgMusic]);

  const [selectedMood, setSelectedMood] = useState<Mood>('on_my_mind');
  const [body, setBody] = useState('');
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(coords ?? null);
  const [placeLabel, setPlaceLabel] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHotline, setShowHotline] = useState(false);

  const { user } = useUser();
  const [selectedStyle, setSelectedStyle] = useState<CardStyleId>(DEFAULT_CARD_STYLE);

  useEffect(() => {
    if (user?.preferred_card_style) {
      setSelectedStyle(user.preferred_card_style);
    }
  }, [user?.preferred_card_style]);

  // Sync `location` whenever the parent updates `coords` (e.g. when the
  // user drags the on-map draft pin). Without this, the post would use the
  // initial double-tap coords even after the user adjusts the pin.
  useEffect(() => {
    if (coords) setLocation(coords);
  }, [coords?.lat, coords?.lng]);

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

  const handlePost = async (crisisHint = false) => {
    if (!location || !body.trim()) return;

    // Layer 1: client-side crisis tripwire
    if (!crisisHint && checkCrisis(body)) {
      setShowHotline(true);
      return;
    }

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
        crisisHint,
      });
      setPosting(false);
      onClose();
      onPosted?.();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
      setPosting(false);
    }
  };

  const charPct = body.length / MAX_CHARS;
  const charNearMax = charPct >= 0.85;

  return (
    <AnimatedSheet
      ref={sheetRef}
      style={[styles.card, { bottom: bottomOffset }]}
    >
      {/* Base surface */}
      <View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: theme.surface, borderRadius: 18 },
        ]}
        pointerEvents="none"
      />
      {/* Top-edge gold highlight */}
      <LinearGradient
        colors={['rgba(244,201,122,0.18)', 'rgba(244,201,122,0)']}
        style={styles.topHighlight}
        pointerEvents="none"
      />

      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: theme.textPrimary, fontFamily: theme.fontFamily }]}>
            new sulat
          </Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>
            {moodEntry?.prompt ?? 'leave a note in the world'}
          </Text>
        </View>
        <PressableScale
          onPress={() => sheetRef.current?.close(onClose)}
          style={[
            styles.iconBtn,
            {
              backgroundColor: 'rgba(255,255,255,0.04)',
              borderColor: 'rgba(255,255,255,0.06)',
            },
          ]}
        >
          <Text style={[styles.iconBtnText, { color: theme.textMuted }]}>✕</Text>
        </PressableScale>
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
          const moodColor = theme.moods[m.id as keyof typeof theme.moods] ?? theme.accent;
          return (
            <PressableScale
              key={m.id}
              onPress={() => setSelectedMood(m.id)}
              scaleAmount={0.95}
              style={[
                styles.moodChip,
                {
                  backgroundColor: active ? `${moodColor}24` : 'rgba(255,255,255,0.03)',
                  borderColor: active ? `${moodColor}55` : theme.border,
                  borderRadius: theme.radii.full,
                },
              ]}
            >
              <Text style={styles.moodEmoji}>{m.emoji}</Text>
              <Text
                style={[
                  styles.moodName,
                  { color: active ? moodColor : theme.textMuted },
                ]}
              >
                {m.name}
              </Text>
            </PressableScale>
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
        maxLength={MAX_CHARS}
      />

      {/* Char count + location chips */}
      <View style={styles.metaRow}>
        {/* Location pill */}
        <View
          style={[
            styles.locationPill,
            {
              borderColor: 'rgba(244,201,122,0.18)',
              backgroundColor: 'rgba(244,201,122,0.06)',
            },
          ]}
        >
          <Text style={styles.locationIcon}>📍</Text>
          <Text style={[styles.locationTxt, { color: theme.textMuted }]} numberOfLines={1}>
            {!location
              ? 'getting location…'
              : placeLabel
                ? placeLabel
                : `${location.lat.toFixed(3)}, ${location.lng.toFixed(3)}`}
          </Text>
        </View>

        <View style={{ flex: 1 }} />

        {/* Char count chip */}
        <View
          style={[
            styles.charChip,
            {
              borderColor: charNearMax ? 'rgba(224,123,84,0.4)' : theme.border,
              backgroundColor: charNearMax ? 'rgba(224,123,84,0.1)' : 'rgba(255,255,255,0.03)',
            },
          ]}
        >
          <Text
            style={[
              styles.charChipText,
              { color: charNearMax ? '#e07b54' : theme.textFaint },
            ]}
          >
            {body.length}/{MAX_CHARS}
          </Text>
        </View>
      </View>

      {error ? <Text style={styles.errorTxt}>{error}</Text> : null}

      {/* Post button */}
      <PressableScale
        onPress={() => handlePost()}
        disabled={!canPost}
        style={[
          styles.postBtn,
          {
            backgroundColor: canPost ? '#a3d9b1' : 'rgba(163,217,177,0.3)',
            borderRadius: theme.radii.md,
            opacity: canPost ? 1 : 0.7,
          },
        ]}
      >
        {posting ? (
          <ActivityIndicator color="#1a3a1f" />
        ) : (
          <Text style={styles.postBtnTxt}>Post sulat</Text>
        )}
      </PressableScale>

      <HotlineOverlay
        visible={showHotline}
        onGetHelp={() => setShowHotline(false)}
        onContinue={() => {
          setShowHotline(false);
          handlePost(true);
        }}
      />
    </AnimatedSheet>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    elevation: 14,
    left: 12,
    overflow: 'hidden',
    paddingBottom: 16,
    paddingHorizontal: 16,
    paddingTop: 14,
    position: 'absolute',
    right: 12,
    shadowColor: '#1a0e00',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.32,
    shadowRadius: 24,
  },
  topHighlight: {
    height: 14,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },

  /* Header */
  header: { alignItems: 'center', flexDirection: 'row', marginBottom: 12 },
  headerTitle: { fontSize: 17, fontWeight: '600', letterSpacing: 0.2 },
  subtitle: { fontSize: 11, marginTop: 1 },
  iconBtn: {
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  iconBtnText: { fontSize: 12, lineHeight: 14 },

  /* Mood picker */
  moodScroll: { marginBottom: 12, marginHorizontal: -2 },
  moodRow: { gap: 6, paddingHorizontal: 2, paddingVertical: 2 },
  moodChip: {
    alignItems: 'center',
    borderWidth: 1,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 5,
  },
  moodEmoji: { fontSize: 12 },
  moodName: { fontSize: 11.5, fontWeight: '600', letterSpacing: -0.05 },

  /* Meta row */
  metaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
    marginTop: 8,
  },
  locationPill: {
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    maxWidth: 220,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  locationIcon: { fontSize: 10 },
  locationTxt: { fontSize: 11, fontWeight: '500' },
  charChip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  charChipText: { fontSize: 10.5, fontWeight: '500', letterSpacing: 0.1 },

  errorTxt: { color: '#ff8a8a', fontSize: 12, marginBottom: 8 },

  /* Post button */
  postBtn: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
  },
  postBtnTxt: {
    color: '#1a3a1f',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
});
