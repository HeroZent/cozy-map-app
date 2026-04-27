// supabase/functions/promote-memories/index.ts
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.104.1';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface StoryRow {
  id: string;
  author_id: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: cors });

  // Verify the caller is pg_cron (server-side only — this function is never called from browsers).
  // pg_cron sends the service role key as the Bearer token (see schedule migration).
  // Raw string comparison is acceptable here: this is a server-to-server call on Supabase's
  // internal network, not exposed to timing attacks from the internet.
  const authHeader = req.headers.get('Authorization');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!authHeader || authHeader !== `Bearer ${serviceRoleKey}`) {
    return new Response('Unauthorized', { status: 401, headers: cors });
  }

  const supa = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    serviceRoleKey,
  );

  // Find stories eligible for memory promotion:
  // live, not yet a memory, older than 7 days
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: stories, error: fetchError } = await supa
    .from('stories')
    .select('id, author_id')
    .eq('is_memory', false)
    .eq('status', 'live')
    .lt('created_at', cutoff) as unknown as { data: StoryRow[] | null; error: { message: string } | null };

  if (fetchError) {
    console.error('[promote-memories] fetch error:', fetchError.message);
    return new Response(JSON.stringify({ error: fetchError.message }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  const candidates = stories ?? [];
  console.log(`[promote-memories] found ${candidates.length} stories to promote`);

  let promoted = 0;
  let failed = 0;

  for (const story of candidates) {
    // Update story first
    const { error: updateError } = await supa
      .from('stories')
      .update({ is_memory: true })
      .eq('id', story.id);

    if (updateError) {
      console.error(`[promote-memories] update failed for ${story.id}:`, updateError.message);
      failed++;
      continue;
    }

    // Insert notification — non-fatal if this fails.
    // The story is already promoted at this point. A missed notification is silent data loss,
    // but is acceptable: the author will still see the ✦ memory badge on their story card.
    // Using a DB transaction (RPC) would be more robust but adds schema complexity.
    // Trade-off documented intentionally.
    const { error: notifError } = await supa
      .from('notifications')
      .insert({
        user_id: story.author_id,
        type: 'memory_promoted',
        story_id: story.id,
        payload: {},
      });

    if (notifError) {
      console.error(`[promote-memories] notification failed for ${story.id}:`, notifError.message);
      // Story is already promoted — do not increment failed
    }

    promoted++;
  }

  return new Response(
    JSON.stringify({ promoted, failed, total: candidates.length }),
    { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } },
  );
});
