import { MOODS, getMoodById } from '@/moods/catalog';

test('MOODS has exactly 8 entries', () => {
  expect(MOODS).toHaveLength(8);
});

test('every mood has id, emoji, name, description, prompt', () => {
  for (const m of MOODS) {
    expect(m.id).toBeTruthy();
    expect(m.emoji).toBeTruthy();
    expect(m.name).toBeTruthy();
    expect(m.description).toBeTruthy();
    expect(m.prompt).toBeTruthy();
  }
});

test('getMoodById returns the right mood', () => {
  expect(getMoodById('hopeful')?.emoji).toBe('🌱');
});

test('getMoodById returns undefined for unknown', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  expect(getMoodById('nope' as any)).toBeUndefined();
});
