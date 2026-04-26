import { useState } from 'react';
import { View } from 'react-native';
import { MoodPicker } from './MoodPicker';
import { TextEditor } from './TextEditor';
import type { Mood } from '@/data/types';

type Step =
  | { kind: 'mood' }
  | { kind: 'text'; mood: Mood }
  | { kind: 'location'; mood: Mood; body: string };

export function ComposerScreen() {
  const [step, setStep] = useState<Step>({ kind: 'mood' });

  return (
    <View style={{ flex: 1 }}>
      {step.kind === 'mood' && (
        <MoodPicker onPick={(mood) => setStep({ kind: 'text', mood })} />
      )}
      {step.kind === 'text' && (
        <TextEditor mood={step.mood} onContinue={(body) => setStep({ kind: 'location', mood: step.mood, body })} />
      )}
      {/* Task 22-23 add location step */}
    </View>
  );
}
