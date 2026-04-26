import { useState } from 'react';
import { View } from 'react-native';
import { MoodPicker } from './MoodPicker';
import type { Mood } from '@/data/types';

type Step = { kind: 'mood' } | { kind: 'text'; mood: Mood } | { kind: 'location'; mood: Mood; body: string };

export function ComposerScreen() {
  const [step, setStep] = useState<Step>({ kind: 'mood' });

  return (
    <View style={{ flex: 1 }}>
      {step.kind === 'mood' && (
        <MoodPicker onPick={(mood) => setStep({ kind: 'text', mood })} />
      )}
      {/* Tasks 21–23 add text and location steps */}
    </View>
  );
}
