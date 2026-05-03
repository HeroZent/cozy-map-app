import { createBag, drawNext } from '../shuffleBag';

describe('shuffleBag', () => {
  test('createBag returns a permutation of the input', () => {
    const ids = ['a', 'b', 'c', 'd'];
    const bag = createBag(ids);
    expect(bag).toHaveLength(ids.length);
    expect([...bag].sort()).toEqual([...ids].sort());
  });

  test('drawNext returns one item and removes it from the bag', () => {
    const bag = ['a', 'b', 'c'];
    const { next, remaining } = drawNext(bag);
    expect(['a', 'b', 'c']).toContain(next);
    expect(remaining).toHaveLength(2);
    expect(remaining).not.toContain(next);
  });

  test('drawNext on a single-item bag returns the item with empty remaining', () => {
    const { next, remaining } = drawNext(['only']);
    expect(next).toBe('only');
    expect(remaining).toEqual([]);
  });

  test('createBag with lastPlayedId never places it at the top', () => {
    // Run many iterations; the first item should never equal lastPlayedId.
    const ids = ['a', 'b', 'c', 'd'];
    for (let i = 0; i < 200; i++) {
      const bag = createBag(ids, 'a');
      expect(bag[0]).not.toBe('a');
    }
  });

  test('1000 draws give roughly equal distribution', () => {
    const ids = ['a', 'b', 'c', 'd'];
    const counts: Record<string, number> = { a: 0, b: 0, c: 0, d: 0 };
    let bag = createBag(ids);
    let lastPlayed: string | undefined;
    for (let i = 0; i < 1000; i++) {
      if (bag.length === 0) bag = createBag(ids, lastPlayed);
      const { next, remaining } = drawNext(bag);
      counts[next]++;
      lastPlayed = next;
      bag = remaining;
    }
    // Each track should appear roughly 250 times. Allow ±15% slack.
    Object.values(counts).forEach((c) => {
      expect(c).toBeGreaterThan(212);
      expect(c).toBeLessThan(288);
    });
  });
});
