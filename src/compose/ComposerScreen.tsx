import { useState } from 'react';
import { Alert, View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { MoodPicker } from './MoodPicker';
import { TextEditor } from './TextEditor';
import { LocationPicker, type PickedLocation } from './LocationPicker';
import { useCreateStory } from '@/data/useCreateStory';
import { useTheme } from '@/theme/ThemeContext';
import type { Mood } from '@/data/types';

type Step =
  | { kind: 'mood' }
  | { kind: 'text'; mood: Mood }
  | { kind: 'location'; mood: Mood; body: string }
  | { kind: 'submitting' };

export interface ComposerScreenProps {
  initialLocation?: PickedLocation;
}

export function ComposerScreen({ initialLocation }: ComposerScreenProps) {
  const [step, setStep] = useState<Step>({ kind: 'mood' });
  const router = useRouter();
  const create = useCreateStory();
  const theme = useTheme();

  const submit = async (mood: Mood, body: string, loc: PickedLocation) => {
    setStep({ kind: 'submitting' });
    try {
      await create({ mood, body, ...loc });
      router.replace('/');
    } catch (e) {
      Alert.alert('Could not post', (e as Error).message);
      setStep({ kind: 'location', mood, body });
    }
  };

  const handleTextContinue = (mood: Mood, body: string) => {
    if (initialLocation) {
      submit(mood, body, initialLocation);
    } else {
      setStep({ kind: 'location', mood, body });
    }
  };

  return (
    <View style={styles.fill}>
      {step.kind === 'mood' && (
        <MoodPicker onPick={(mood) => setStep({ kind: 'text', mood })} />
      )}
      {step.kind === 'text' && (
        <View style={styles.fill}>
          {initialLocation && (
            <View style={styles.locationBanner}>
              <Text style={[styles.locationBannerText, { color: theme.textPrimary, fontFamily: theme.fontFamily }]}>
                Pinned to map
              </Text>
            </View>
          )}
          <TextEditor mood={step.mood} onContinue={(body) => handleTextContinue(step.mood, body)} />
        </View>
      )}
      {step.kind === 'location' && (
        <LocationPicker onPick={(loc) => submit(step.mood, step.body, loc)} />
      )}
      {step.kind === 'submitting' && (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={theme.accent} size="large" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  loadingBox: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  locationBanner: {
    alignItems: 'center',
    paddingBottom: 4,
    paddingTop: 12,
  },
  locationBannerText: {
    fontSize: 13,
    opacity: 0.7,
  },
});
