import { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { MoodPicker } from './MoodPicker';
import { TextEditor } from './TextEditor';
import { LocationPicker, type PickedLocation } from './LocationPicker';
import { useCreateStory } from '@/data/useCreateStory';
import type { Mood } from '@/data/types';

type Step =
  | { kind: 'mood' }
  | { kind: 'text'; mood: Mood }
  | { kind: 'location'; mood: Mood; body: string }
  | { kind: 'submitting' };

export function ComposerScreen() {
  const [step, setStep] = useState<Step>({ kind: 'mood' });
  const router = useRouter();
  const create = useCreateStory();

  const submit = async (mood: Mood, body: string, loc: PickedLocation) => {
    setStep({ kind: 'submitting' });
    try {
      await create({ mood, body, ...loc });
      router.replace('/');
    } catch (e) {
      alert(`Could not post: ${(e as Error).message}`);
      setStep({ kind: 'location', mood, body });
    }
  };

  return (
    <View style={{ flex: 1 }}>
      {step.kind === 'mood' && (
        <MoodPicker onPick={(mood) => setStep({ kind: 'text', mood })} />
      )}
      {step.kind === 'text' && (
        <TextEditor mood={step.mood} onContinue={(body) => setStep({ kind: 'location', mood: step.mood, body })} />
      )}
      {step.kind === 'location' && (
        <LocationPicker onPick={(loc) => submit(step.mood, step.body, loc)} />
      )}
      {step.kind === 'submitting' && (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }} />
      )}
    </View>
  );
}
