import { supabase } from './supabase';
import type { Mood, PinMode } from './types';
import type { CardStyleId } from '@/story/cardStyles';

export interface CreateStoryArgs {
  mood: Mood;
  body: string;
  coords: { lat: number; lng: number };
  pinMode: PinMode;
  label?: string;
  cardStyle: CardStyleId;
}

export function useCreateStory() {
  return async function create({ mood, body, coords, pinMode, label, cardStyle }: CreateStoryArgs): Promise<string> {
    const { data, error } = await supabase.functions.invoke('create-story', {
      body: {
        mood,
        body,
        lat: coords.lat,
        lng: coords.lng,
        pin_mode: pinMode,
        location_label: label ?? null,
        card_style: cardStyle,
      },
    });
    if (error) throw new Error(error.message);
    return (data as { id: string }).id;
  };
}
