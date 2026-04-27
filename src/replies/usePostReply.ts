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
    if (error) {
      // Extract friendly message from 422 response body
      const ctx = (error as { context?: Response }).context;
      if (ctx) {
        const json = await ctx.json().catch(() => null);
        if (json?.error) throw new Error(json.error);
      }
      throw new Error(error.message);
    }
    return data as PostReplyResult;
  };
}
