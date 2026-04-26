// src/reactions/useFlag.ts
import { supabase } from '@/data/supabase';

export function useFlag() {
  return async function flag(storyId: string, reason: string): Promise<void> {
    const { error } = await supabase.functions.invoke('flag-story', {
      body: { story_id: storyId, reason },
    });
    if (error) throw new Error(error.message);
  };
}
