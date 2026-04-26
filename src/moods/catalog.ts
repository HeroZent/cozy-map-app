import type { Mood } from '@/data/types';

export interface MoodEntry {
  id: Mood;
  emoji: string;
  name: string;
  description: string;
  prompt: string;
}

export const MOODS: MoodEntry[] = [
  { id: 'regret',        emoji: '🌙', name: 'Regret',        description: "Things I wish I'd done differently", prompt: 'What do you regret?' },
  { id: 'on_my_mind',    emoji: '💭', name: 'On my mind',    description: "Whatever I'm thinking right now",     prompt: "What's on your mind?" },
  { id: 'struggling',    emoji: '🌧️', name: 'Struggling',    description: 'Going through something hard',         prompt: "What are you carrying?" },
  { id: 'hopeful',       emoji: '🌱', name: 'Hopeful',       description: 'Looking forward, feeling lighter',     prompt: "What's giving you hope?" },
  { id: 'memory',        emoji: '🕯️', name: 'Memory',        description: 'Honoring someone or something I miss', prompt: "Who or what are you remembering?" },
  { id: 'dream',         emoji: '✨', name: 'Dream',         description: 'Something I want for my life',         prompt: "What do you wish for?" },
  { id: 'unsent_letter', emoji: '💌', name: 'Unsent letter', description: 'Something I never said to someone',    prompt: 'Who is this letter for?' },
  { id: 'forgiveness',   emoji: '🤍', name: 'Forgiveness',   description: 'Letting go of something that hurt',    prompt: "What are you letting go of?" },
];

export function getMoodById(id: Mood): MoodEntry | undefined {
  return MOODS.find((m) => m.id === id);
}
