// supabase/functions/_shared/moderate.ts

export type ModerationVerdict =
  | 'pass'       // clean content, post it
  | 'reject'     // OpenAI flagged it — do not post
  | 'crisis'     // Anthropic: person in immediate crisis
  | 'processing' // Anthropic: person struggling but not in immediate crisis
  | 'metaphor';  // Anthropic: figurative language, safe

export interface ModerationResult {
  verdict: ModerationVerdict;
  service: string;
  crisisScore: number | null;
}

/** Layer 2a: OpenAI /moderations */
async function runOpenAIMod(
  text: string,
  openaiKey: string,
): Promise<{ flagged: boolean }> {
  const res = await fetch('https://api.openai.com/v1/moderations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${openaiKey}`,
    },
    body: JSON.stringify({ input: text }),
  });
  if (!res.ok) throw new Error(`OpenAI moderation error: ${res.status}`);
  const json = (await res.json()) as { results: { flagged: boolean }[] };
  return { flagged: json.results[0]?.flagged ?? false };
}

/** Layer 2b: Anthropic Haiku crisis classification */
async function runHaikuCrisis(
  text: string,
  anthropicKey: string,
): Promise<'crisis' | 'processing' | 'metaphor'> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': anthropicKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5',
      max_tokens: 10,
      system:
        'Classify the social media post in the next message. ' +
        'Reply with exactly one word: "crisis", "processing", or "metaphor". ' +
        'crisis = person in immediate danger or distress. ' +
        'processing = person struggling but not in immediate danger. ' +
        'metaphor = figurative language, safe.',
      messages: [
        { role: 'user', content: text },
      ],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic error: ${res.status}`);
  const json = (await res.json()) as { content: { text: string }[] };
  const raw = json.content[0]?.text?.toLowerCase().trim() ?? '';
  if (raw === 'crisis') return 'crisis';
  if (raw === 'processing') return 'processing';
  if (raw === 'metaphor') return 'metaphor';
  // Haiku added extra words — fall back to substring matching
  if (raw.includes('crisis')) return 'crisis';
  if (raw.includes('processing')) return 'processing';
  return 'metaphor';
}

/**
 * Run the moderation pipeline.
 *
 * crisisHint = false → Layer 2a only (OpenAI).
 * crisisHint = true  → Layer 2b (OpenAI then Anthropic Haiku).
 *
 * Fails open: if an API call throws, returns verdict:'pass' so a
 * temporary third-party outage never blocks legitimate posts.
 */
export async function moderateContent(
  text: string,
  crisisHint: boolean,
): Promise<ModerationResult> {
  const openaiKey = Deno.env.get('OPENAI_API_KEY') ?? '';
  const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY') ?? '';

  if (!openaiKey) {
    return { verdict: 'pass', service: 'config_error_no_openai_key', crisisScore: null };
  }

  try {
    const { flagged } = await runOpenAIMod(text, openaiKey);
    if (flagged) return { verdict: 'reject', service: 'openai', crisisScore: null };
  } catch {
    // Fail open on OpenAI outage
    return { verdict: 'pass', service: 'openai_error', crisisScore: null };
  }

  if (!crisisHint) {
    return { verdict: 'pass', service: 'openai', crisisScore: null };
  }

  if (!anthropicKey) {
    return { verdict: 'pass', service: 'config_error_no_anthropic_key', crisisScore: null };
  }

  try {
    const haiku = await runHaikuCrisis(text, anthropicKey);
    const score = haiku === 'crisis' ? 1 : haiku === 'processing' ? 0.5 : 0;
    return { verdict: haiku, service: 'anthropic', crisisScore: score };
  } catch {
    // Fail open on Anthropic outage — post goes through without note
    return { verdict: 'pass', service: 'anthropic_error', crisisScore: null };
  }
}
