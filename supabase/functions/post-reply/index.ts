import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: cors });

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return new Response('Unauthorized', { status: 401, headers: cors });

  let payload: { story_id: string; body: string };
  try {
    payload = await req.json();
  } catch {
    return new Response('Bad JSON', { status: 400, headers: cors });
  }

  if (!payload.story_id || !UUID_RE.test(payload.story_id)) {
    return new Response('Invalid story_id', { status: 400, headers: cors });
  }

  const body = typeof payload.body === 'string' ? payload.body.trim() : '';
  if (!body || body.length > 300) {
    return new Response('body must be 1–300 chars', { status: 400, headers: cors });
  }

  const supa = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } },
  );

  const { data: authUser } = await supa.auth.getUser();
  if (!authUser?.user) return new Response('Unauthorized', { status: 401, headers: cors });

  const { data: story } = await supa
    .from('stories')
    .select('id')
    .eq('id', payload.story_id)
    .eq('status', 'live')
    .maybeSingle();

  if (!story) return new Response('Story not found', { status: 404, headers: cors });

  const { data, error } = await supa
    .from('replies')
    .insert({ story_id: payload.story_id, author_id: authUser.user.id, body, status: 'live' })
    .select('id')
    .single();

  if (error) return new Response(error.message, { status: 400, headers: cors });

  return new Response(JSON.stringify({ id: data.id }), {
    status: 201,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
});
