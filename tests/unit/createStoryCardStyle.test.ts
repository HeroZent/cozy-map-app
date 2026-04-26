// Isolated test for the card_style validation/defaulting logic
// extracted from supabase/functions/create-story/index.ts

const VALID_CARD_STYLE_RE = /^[a-z0-9_]{1,32}$/;

function deriveCardStyle(raw: unknown): string {
  return typeof raw === 'string' && VALID_CARD_STYLE_RE.test(raw) ? raw : 'a';
}

test('valid card style a passes through', () => {
  expect(deriveCardStyle('a')).toBe('a');
});

test('valid card style e passes through', () => {
  expect(deriveCardStyle('e')).toBe('e');
});

test('valid future style "vintage_rose" passes through', () => {
  expect(deriveCardStyle('vintage_rose')).toBe('vintage_rose');
});

test('null defaults to a', () => {
  expect(deriveCardStyle(null)).toBe('a');
});

test('undefined defaults to a', () => {
  expect(deriveCardStyle(undefined)).toBe('a');
});

test('empty string defaults to a', () => {
  expect(deriveCardStyle('')).toBe('a');
});

test('string with uppercase defaults to a', () => {
  expect(deriveCardStyle('A')).toBe('a');
});

test('string over 32 chars defaults to a', () => {
  expect(deriveCardStyle('a'.repeat(33))).toBe('a');
});

test('string with special chars defaults to a', () => {
  expect(deriveCardStyle('hello world!')).toBe('a');
});
