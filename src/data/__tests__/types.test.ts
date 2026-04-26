import type { Story, User } from '../types';
import type { CardStyleId } from '@/story/cardStyles';

test('Story interface has card_style field typed as CardStyleId', () => {
  // Compile-time check: assignability
  const s: Pick<Story, 'card_style'> = { card_style: 'a' };
  expect(s.card_style).toBe('a');

  const s2: Pick<Story, 'card_style'> = { card_style: 'e' };
  expect(s2.card_style).toBe('e');
});

test('User interface has preferred_card_style field typed as CardStyleId', () => {
  const u: Pick<User, 'preferred_card_style'> = { preferred_card_style: 'b' };
  expect(u.preferred_card_style).toBe('b');
});
