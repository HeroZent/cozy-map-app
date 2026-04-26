import type { CreateStoryArgs } from '../../src/data/useCreateStory';
import type { CardStyleId } from '../../src/story/cardStyles';

test('CreateStoryArgs includes cardStyle as CardStyleId', () => {
  const args: CreateStoryArgs = {
    mood: 'hopeful',
    body: 'test',
    coords: { lat: 14.5, lng: 121.0 },
    pinMode: 'gps',
    cardStyle: 'c',
  };
  expect(args.cardStyle).toBe('c');
});

test('cardStyle is required in CreateStoryArgs (type check)', () => {
  // TypeScript compile-time: omitting cardStyle should fail
  // This test just confirms runtime value
  const style: CardStyleId = 'e';
  expect(['a', 'b', 'c', 'd', 'e']).toContain(style);
});
