// supabase/functions/create-story/index.ts
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { moderateContent } from '../_shared/moderate.ts';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface CreateStoryBody {
  mood: string;
  body: string;
  lat: number;
  lng: number;
  pin_mode: 'gps' | 'dropped' | 'city';
  location_label?: string | null;
  language?: string | null;
  card_style?: string | null;
  crisis_hint?: boolean;
}

const VALID_MOODS = new Set([
  'regret', 'on_my_mind', 'struggling', 'hopeful',
  'memory', 'dream', 'unsent_letter', 'forgiveness',
]);
const VALID_PIN_MODES = new Set(['gps', 'dropped', 'city']);
const VALID_CARD_STYLE_RE = /^[a-z0-9_]{1,32}$/;

const GRID = 0.0045;
function round500m(n: number) { return Math.round(n / GRID) * GRID; }

const REJECTION_MSG =
  "This story didn't pass our quiet-space check. If you think this was a mistake, revise your story and try again.";

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: cors });

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return new Response('Unauthorized', { status: 401, headers: cors });

  let payload: CreateStoryBody;
  try {
    payload = await req.json();
  } catch {
    return new Response('Bad JSON', { status: 400, headers: cors });
  }

  if (!VALID_MOODS.has(payload.mood))
    return new Response('Invalid mood', { status: 400, headers: cors });
  if (!VALID_PIN_MODES.has(payload.pin_mode))
    return new Response('Invalid pin_mode', { status: 400, headers: cors });
  if (typeof payload.body !== 'string' || payload.body.length < 1 || payload.body.length > 1000)
    return new Response('Body length must be 1..1000 chars', { status: 400, headers: cors });
  if (typeof payload.lat !== 'number' || typeof payload.lng !== 'number')
    return new Response('Invalid coordinates', { status: 400, headers: cors });

  const cardStyle =
    typeof payload.card_style === 'string' && VALID_CARD_STYLE_RE.test(payload.card_style)
      ? payload.card_style
      : 'a';

  const crisisHint = payload.crisis_hint === true;

  // ── Moderation ───────────────────────────────────────────────────────────
  const modResult = await moderateContent(payload.body, crisisHint);

  if (modResult.verdict === 'reject') {
    return new Response(JSON.stringify({ error: REJECTION_MSG }), {
      status: 422,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  // has_crisis_note = true when Anthropic classified as crisis or processing
  const hasCrisisNote = modResult.verdict === 'crisis' || modResult.verdict === 'processing';

  // ── Auth ─────────────────────────────────────────────────────────────────
  const supa = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } },
  );

  const { data: authUser } = await supa.auth.getUser();
  if (!authUser?.user) return new Response('Unauthorized', { status: 401, headers: cors });

  const lat = round500m(payload.lat);
  const lng = round500m(payload.lng);

  // ── Insert ────────────────────────────────────────────────────────────────
  const insert = await supa.from('stories').insert({
    author_id: authUser.user.id,
    mood: payload.mood,
    body: payload.body,
    location: `SRID=4326;POINT(${lng} ${lat})`,
    location_label: payload.location_label ?? null,
    pin_mode: payload.pin_mode,
    language: payload.language ?? 'en',
    card_style: cardStyle,
    status: 'live',
    has_crisis_note: hasCrisisNote,
  }).select('id').single();

  if (insert.error) {
    console.error('[create-story] insert error:', insert.error.message);
    return new Response('Failed to create story', { status: 500, headers: cors });
  }

  // ── Audit log ─────────────────────────────────────────────────────────────
  const serviceSupa = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );
  // Write audit log — intentionally non-blocking: story is already live
  const { error: auditError } = await serviceSupa.from('moderation_events').insert({
    target_type: 'story',
    target_id: insert.data.id,
    verdict: modResult.verdict,
    service: modResult.service,
    crisis_score: modResult.crisisScore,
    metadata: { crisis_hint: crisisHint },
  });
  if (auditError) {
    console.error('[moderation_events] audit write failed:', auditError.message);
  }

  return new Response(JSON.stringify({ id: insert.data.id }), {
    status: 201,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
});
