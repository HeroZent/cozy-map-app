/**
 * Pure shuffle-bag logic. No React, no audio side-effects.
 *
 * The bag is a randomized queue: createBag returns a permutation, drawNext
 * pops one item from the front. Once the bag is empty, the caller refills
 * via createBag. Passing lastPlayedId to createBag prevents the just-played
 * track from being placed at the top of the new bag, which would cause an
 * audible repeat across the bag boundary.
 */
export function createBag(trackIds: string[], lastPlayedId?: string): string[] {
  if (trackIds.length === 0) return [];
  // Fisher-Yates shuffle on a copy.
  const bag = [...trackIds];
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [bag[i], bag[j]] = [bag[j], bag[i]];
  }
  // Avoid placing lastPlayedId at the top — swap it with index 1 if needed.
  if (lastPlayedId && bag.length > 1 && bag[0] === lastPlayedId) {
    [bag[0], bag[1]] = [bag[1], bag[0]];
  }
  return bag;
}

export function drawNext(bag: string[]): { next: string; remaining: string[] } {
  if (bag.length === 0) {
    throw new Error('drawNext called on empty bag — caller must refill via createBag');
  }
  return { next: bag[0], remaining: bag.slice(1) };
}
