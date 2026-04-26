import type { Mood, PinMode } from './types';

export interface CreateStoryArgs {
  mood: Mood;
  body: string;
  coords: { lat: number; lng: number };
  pinMode: PinMode;
  label?: string;
}

export function useCreateStory() {
  return async function create(_args: CreateStoryArgs): Promise<string> {
    throw new Error('useCreateStory not yet implemented');
  };
}
