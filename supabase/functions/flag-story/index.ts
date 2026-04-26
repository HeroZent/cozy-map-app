import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const VALID_REASONS = new Set([
  'Harmful or dangerous',
  'Sexual or explicit',
  'Spam',
  'Harassment',
  'Other',
]);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: cors });

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return new Response('Unauthorized', { status: 401, headers: cors });

  let payload: { story_id: string; reason: string };
  try {
    payload = await req.json();
  } catch {
    return new Response('Bad JSON', { status: 400, headers: cors });
  }

  if (!payload.story_id || !UUID_RE.test(payload.story_id)) {
    return new Response('Invalid story_id', { status: 400, headers: cors });
  }
  if (!payload.reason || !VALID_REASONS.has(payload.reason)) {
    return new Response('Invalid reason', { status: 400, headers: cors });
  }

  const authSupa = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: authUser } = await authSupa.auth.getUser();
  if (!authUser?.user) return new Response('Unauthorized', { status: 401, headers: cors });
  const userId = authUser.user.id;

  // Use service role for admin queries (flag count, status update)
  const adminSupa = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  // Prevent double-flagging
  const { data: existingFlag } = await adminSupa
    .from('flags')
    .select('id')
    .eq('target_type', 'story')
    .eq('target_id', payload.story_id)
    .eq('flagged_by', userId)
    .maybeSingle();

  if (existingFlag) {
    return new Response(JSON.stringify({ ok: true, already_flagged: true }), {
      status: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  // Insert flag
  const { error: insertError } = await adminSupa.from('flags').insert({
    target_type: 'story',
    target_id: payload.story_id,
    flagged_by: userId,
    reason: payload.reason,
  });

  if (insertError) return new Response(insertError.message, { status: 500, headers: cors });

  // Auto-threshold: if ≥ 3 flags, mark story as flagged
  const { count } = await adminSupa
    .from('flags')
    .select('id', { count: 'exact', head: true })
    .eq('target_type', 'story')
    .eq('target_id', payload.story_id);

  if ((count ?? 0) >= 3) {
    await adminSupa
      .from('stories')
      .update({ status: 'flagged' })
      .eq('id', payload.story_id);
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 201,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
});
