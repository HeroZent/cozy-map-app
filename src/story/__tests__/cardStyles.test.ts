import { getCardStyle, CARD_STYLES, DEFAULT_CARD_STYLE } from '../cardStyles';

test('DEFAULT_CARD_STYLE is a', () => {
  expect(DEFAULT_CARD_STYLE).toBe('a');
});

test('getCardStyle returns correct def for known id', () => {
  const def = getCardStyle('b');
  expect(def.id).toBe('b');
  expect(def.label).toBe('Dark Candlelight');
});

test('getCardStyle falls back to CARD_STYLES[0] for unknown id', () => {
  const def = getCardStyle('unknown_xyz');
  expect(def).toBe(CARD_STYLES[0]);
  expect(def.id).toBe(DEFAULT_CARD_STYLE);
});

test('CARD_STYLES has exactly 5 entries', () => {
  expect(CARD_STYLES).toHaveLength(5);
});

test('all 5 styles are free tier', () => {
  expect(CARD_STYLES.every((s) => s.tier === 'free')).toBe(true);
});

test('each style has required visual fields', () => {
  for (const style of CARD_STYLES) {
    expect(style.id).toBeTruthy();
    expect(style.label).toBeTruthy();
    expect(style.fontFamily).toBeTruthy();
    expect(style.backgroundColors.length).toBeGreaterThanOrEqual(1);
    expect(typeof style.textColor).toBe('string');
    expect(typeof style.fontSize).toBe('number');
    expect(typeof style.lineHeight).toBe('number');
  }
});

test('getCardStyle(a) has ruledLines true', () => {
  expect(getCardStyle('a').ruledLines).toBe(true);
});

test('getCardStyle(c) has tornTopEdge true', () => {
  expect(getCardStyle('c').tornTopEdge).toBe(true);
});

test('getCardStyle(d) has leftMarginStripe true', () => {
  expect(getCardStyle('d').leftMarginStripe).toBe(true);
});

test('getCardStyle(e) has foldCorner true', () => {
  expect(getCardStyle('e').foldCorner).toBe(true);
});

test('getCardStyle(b) has pillFooter true', () => {
  expect(getCardStyle('b').pillFooter).toBe(true);
});

test('getCardStyle(c) has sealFooter true', () => {
  expect(getCardStyle('c').sealFooter).toBe(true);
});

test('each style has showPostmark boolean', () => {
  for (const style of CARD_STYLES) {
    expect(typeof style.showPostmark).toBe('boolean');
  }
});

test('showPostmark is true for styles a, c, e', () => {
  expect(getCardStyle('a').showPostmark).toBe(true);
  expect(getCardStyle('c').showPostmark).toBe(true);
  expect(getCardStyle('e').showPostmark).toBe(true);
});

test('showPostmark is false for styles b, d', () => {
  expect(getCardStyle('b').showPostmark).toBe(false);
  expect(getCardStyle('d').showPostmark).toBe(false);
});

test('style a fontSize is 18 and lineHeight is 34', () => {
  const def = getCardStyle('a');
  expect(def.fontSize).toBe(18);
  expect(def.lineHeight).toBe(34);
});

test('all styles have correct fontSize and lineHeight', () => {
  expect(getCardStyle('b')).toMatchObject({ fontSize: 20, lineHeight: 32 });
  expect(getCardStyle('c')).toMatchObject({ fontSize: 20, lineHeight: 32 });
  expect(getCardStyle('d')).toMatchObject({ fontSize: 17, lineHeight: 34 });
  expect(getCardStyle('e')).toMatchObject({ fontSize: 21, lineHeight: 32 });
});
