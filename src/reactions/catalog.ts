export type ReactionEmoji = 'candle' | 'heart' | 'thought' | 'seed' | 'hug' | 'care';

export interface ReactionEntry {
  emoji: ReactionEmoji;
  icon: string;
  label: string;
}

export const REACTIONS: ReactionEntry[] = [
  { emoji: 'candle',  icon: '🕯️', label: 'Felt this' },
  { emoji: 'heart',   icon: '🤍', label: 'Sending love' },
  { emoji: 'thought', icon: '💭', label: 'Thinking of you' },
  { emoji: 'seed',    icon: '🌱', label: 'Stay hopeful' },
  { emoji: 'hug',     icon: '🫂', label: 'I hear you' },
  { emoji: 'care',    icon: '🤗', label: 'Sending hugs' },
];

export function getReactionByEmoji(emoji: ReactionEmoji): ReactionEntry | undefined {
  return REACTIONS.find((r) => r.emoji === emoji);
}
