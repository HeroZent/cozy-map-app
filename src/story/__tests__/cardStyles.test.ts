import { getCardStyle, CARD_STYLES, DEFAULT_CARD_STYLE } from '../cardStyles';

test('DEFAULT_CARD_STYLE is a', () => {
  expect(DEFAULT_CARD_STYLE).toBe('a');
});

test('getCardStyle returns correct def for known id', () => {
  const def = getCardStyle('b');
  expect(def.id).toBe('b');
  expect(def.label).toBe('Dark Candlelight');
});

test('getCardStyle falls back to style a for unknown id', () => {
  const def = getCardStyle('unknown_xyz');
  expect(def.id).toBe('a');
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
