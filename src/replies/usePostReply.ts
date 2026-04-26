// src/replies/usePostReply.ts
import { supabase } from '@/data/supabase';

export interface PostReplyResult {
  id: string;
}

export function usePostReply() {
  return async function postReply(storyId: string, body: string): Promise<PostReplyResult> {
    const { data, error } = await supabase.functions.invoke('post-reply', {
      body: { story_id: storyId, body },
    });
    if (error) throw new Error(error.message);
    return data as PostReplyResult;
  };
}
