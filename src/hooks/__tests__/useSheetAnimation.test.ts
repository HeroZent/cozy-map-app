import { renderHook, act } from '@testing-library/react-native';
import { useSheetAnimation } from '../useSheetAnimation';

test('returns open and close functions', () => {
  const { result } = renderHook(() => useSheetAnimation());
  expect(typeof result.current.open).toBe('function');
  expect(typeof result.current.close).toBe('function');
});

test('returns 6 animated values', () => {
  const { result } = renderHook(() => useSheetAnimation());
  const { scaleAnim, opacityAnim, creaseOpacity1, creaseOpacity2, glintOpacity, glintTranslateX } =
    result.current;
  // Each is an Animated.Value — check it has a setValue method
  expect(typeof scaleAnim.setValue).toBe('function');
  expect(typeof opacityAnim.setValue).toBe('function');
  expect(typeof creaseOpacity1.setValue).toBe('function');
  expect(typeof creaseOpacity2.setValue).toBe('function');
  expect(typeof glintOpacity.setValue).toBe('function');
  expect(typeof glintTranslateX.setValue).toBe('function');
});

test('open() does not throw', () => {
  const { result } = renderHook(() => useSheetAnimation());
  expect(() => act(() => result.current.open())).not.toThrow();
});

test('close() calls onDone after animation', () => {
  jest.useFakeTimers();
  const { result } = renderHook(() => useSheetAnimation());
  const onDone = jest.fn();
  act(() => {
    result.current.open();
    result.current.close(onDone);
  });
  act(() => { jest.runAllTimers(); });
  expect(onDone).toHaveBeenCalledTimes(1);
  jest.useRealTimers();
});
