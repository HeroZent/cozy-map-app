// src/reactions/useReact.ts
import { supabase } from '@/data/supabase';

export interface ReactResult {
  action: 'added' | 'removed';
}

export function useReact() {
  return async function react(storyId: string, emoji: string): Promise<ReactResult> {
    const { data, error } = await supabase.functions.invoke('react-story', {
      body: { story_id: storyId, emoji },
    });
    if (error) throw new Error(error.message);
    return data as ReactResult;
  };
}
