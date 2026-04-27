// supabase/functions/_shared/moderate.ts

export type ModerationVerdict =
  | 'pass'       // clean content, post it
  | 'reject'     // harmful content — do not post
  | 'crisis'     // Anthropic: person in immediate crisis
  | 'processing' // Anthropic: person struggling but not in immediate crisis
  | 'metaphor';  // Anthropic: figurative language, safe

export interface ModerationResult {
  verdict: ModerationVerdict;
  service: string;
  crisisScore: number | null;
}

/** Shared helper: POST to Anthropic Messages API */
async function callHaiku(
  system: string,
  userContent: string,
  anthropicKey: string,
  maxTokens = 10,
): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': anthropicKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5',
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: userContent }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic error: ${res.status}`);
  const json = (await res.json()) as { content: { text: string }[] };
  return json.content[0]?.text?.toLowerCase().trim() ?? '';
}

/**
 * Layer 2a: Anthropic Haiku general content moderation.
 * Replaces OpenAI /moderations — same fail-open contract.
 * Returns flagged=true only for clearly harmful content (hate, violence, sexual).
 */
async function runHaikuMod(
  text: string,
  anthropicKey: string,
): Promise<{ flagged: boolean }> {
  const raw = await callHaiku(
    'You are a content moderator for a cozy, anonymous social journaling app. ' +
    'Review the post in the next message and reply with exactly one word: ' +
    '"flag" if it contains hate speech, graphic violence, sexual content, or threats of harm toward others. ' +
    '"pass" for everything else — including personal struggles, sadness, grief, or crisis language, ' +
    'which are handled separately and should NOT be flagged here.',
    text,
    anthropicKey,
  );
  // Exact match first, then substring fallback
  if (raw === 'flag') return { flagged: true };
  if (raw === 'pass') return { flagged: false };
  if (raw.includes('flag')) return { flagged: true };
  return { flagged: false };
}

/** Layer 2b: Anthropic Haiku crisis classification */
async function runHaikuCrisis(
  text: string,
  anthropicKey: string,
): Promise<'crisis' | 'processing' | 'metaphor'> {
  const raw = await callHaiku(
    'Classify the social media post in the next message. ' +
    'Reply with exactly one word: "crisis", "processing", or "metaphor". ' +
    'crisis = person in immediate danger or distress. ' +
    'processing = person struggling but not in immediate danger. ' +
    'metaphor = figurative language, safe.',
    text,
    anthropicKey,
  );
  if (raw === 'crisis') return 'crisis';
  if (raw === 'processing') return 'processing';
  if (raw === 'metaphor') return 'metaphor';
  // Haiku added extra words — substring fallback
  if (raw.includes('crisis')) return 'crisis';
  if (raw.includes('processing')) return 'processing';
  return 'metaphor';
}

/**
 * Run the moderation pipeline.
 *
 * crisisHint = false → Layer 2a only (Haiku general moderation).
 * crisisHint = true  → Layer 2a then Layer 2b (Haiku crisis classification).
 *
 * Fails open: if an API call throws, returns verdict:'pass' so a
 * temporary outage never blocks legitimate posts.
 */
export async function moderateContent(
  text: string,
  crisisHint: boolean,
): Promise<ModerationResult> {
  const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY') ?? '';

  if (!anthropicKey) {
    return { verdict: 'pass', service: 'config_error_no_anthropic_key', crisisScore: null };
  }

  // Layer 2a: general content moderation
  try {
    const { flagged } = await runHaikuMod(text, anthropicKey);
    if (flagged) return { verdict: 'reject', service: 'anthropic_mod', crisisScore: null };
  } catch {
    // Fail open on outage — don't block posts due to API errors
    return { verdict: 'pass', service: 'anthropic_mod_error', crisisScore: null };
  }

  if (!crisisHint) {
    return { verdict: 'pass', service: 'anthropic_mod', crisisScore: null };
  }

  // Layer 2b: crisis classification (only runs when tripwire fired client-side)
  try {
    const haiku = await runHaikuCrisis(text, anthropicKey);
    const score = haiku === 'crisis' ? 1 : haiku === 'processing' ? 0.5 : 0;
    return { verdict: haiku, service: 'anthropic_crisis', crisisScore: score };
  } catch {
    // Fail open — post goes through without crisis note
    return { verdict: 'pass', service: 'anthropic_crisis_error', crisisScore: null };
  }
}
