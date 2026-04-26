import { renderHook, waitFor } from '@testing-library/react-native';
import { useStories } from '@/data/useStories';

test('useStories returns an array (possibly empty) for any bbox', async () => {
  const { result } = renderHook(() =>
    useStories({ minLng: 100, minLat: 0, maxLng: 130, maxLat: 25 }),
  );
  await waitFor(() => expect(result.current.loading).toBe(false), { timeout: 10000 });
  expect(Array.isArray(result.current.stories)).toBe(true);
});
