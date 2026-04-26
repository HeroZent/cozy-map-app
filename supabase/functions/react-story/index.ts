import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const VALID_EMOJIS = new Set(['candle', 'heart', 'thought', 'seed', 'hug', 'care']);

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: cors });

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return new Response('Unauthorized', { status: 401, headers: cors });

  let payload: { story_id: string; emoji: string };
  try {
    payload = await req.json();
  } catch {
    return new Response('Bad JSON', { status: 400, headers: cors });
  }

  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!payload.story_id || !UUID_RE.test(payload.story_id)) {
    return new Response('Invalid story_id', { status: 400, headers: cors });
  }
  if (!payload.emoji || !VALID_EMOJIS.has(payload.emoji)) {
    return new Response('Invalid emoji', { status: 400, headers: cors });
  }

  const supa = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } },
  );

  const { data: authUser } = await supa.auth.getUser();
  if (!authUser?.user) return new Response('Unauthorized', { status: 401, headers: cors });

  const userId = authUser.user.id;

  // Check if this exact reaction already exists
  const { data: existing } = await supa
    .from('reactions')
    .select('id')
    .eq('story_id', payload.story_id)
    .eq('user_id', userId)
    .eq('emoji', payload.emoji)
    .maybeSingle();

  if (existing) {
    // Toggle off — delete
    const { error: deleteError } = await supa.from('reactions').delete().eq('id', existing.id);
    if (deleteError) return new Response(deleteError.message, { status: 500, headers: cors });
    return new Response(JSON.stringify({ action: 'removed' }), {
      status: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  // Toggle on — insert
  const { error } = await supa.from('reactions').insert({
    story_id: payload.story_id,
    user_id: userId,
    emoji: payload.emoji,
  });

  if (error) return new Response(error.message, { status: 400, headers: cors });

  return new Response(JSON.stringify({ action: 'added' }), {
    status: 201,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
});
