import { render, act } from '@testing-library/react-native';
import { Text, View } from 'react-native';
import { useLoaderGating } from '../useLoaderGating';

function Harness({ loading, onChange }: { loading: boolean; onChange?: (s: { visible: boolean; mounted: boolean }) => void }) {
  const gate = useLoaderGating(loading);
  if (onChange) onChange({ visible: gate.visible, mounted: gate.mounted });
  return (
    <View>
      <Text testID="visible">{String(gate.visible)}</Text>
      <Text testID="mounted">{String(gate.mounted)}</Text>
    </View>
  );
}

describe('useLoaderGating', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-05-04T00:00:00Z'));
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  test('initial state: visible=true, mounted=true', () => {
    const { getByTestId } = render(<Harness loading={true} />);
    expect(getByTestId('visible').props.children).toBe('true');
    expect(getByTestId('mounted').props.children).toBe('true');
  });

  test('with loading=false from the start, holds visible until 1200ms minimum elapses', () => {
    const { getByTestId } = render(<Harness loading={false} />);
    expect(getByTestId('visible').props.children).toBe('true');
    act(() => { jest.advanceTimersByTime(500); });
    expect(getByTestId('visible').props.children).toBe('true');
    act(() => { jest.advanceTimersByTime(700); });
    // Now at 1200ms — visible should flip false
    expect(getByTestId('visible').props.children).toBe('false');
  });

  test('when loading flips false after 2000ms, visible flips false immediately (already past floor)', () => {
    const { getByTestId, rerender } = render(<Harness loading={true} />);
    act(() => { jest.advanceTimersByTime(2000); });
    rerender(<Harness loading={false} />);
    act(() => { jest.advanceTimersByTime(0); });
    expect(getByTestId('visible').props.children).toBe('false');
  });

  test('hard cap fires at 8000ms even if loading never flips false', () => {
    const { getByTestId } = render(<Harness loading={true} />);
    act(() => { jest.advanceTimersByTime(7999); });
    expect(getByTestId('visible').props.children).toBe('true');
    act(() => { jest.advanceTimersByTime(2); });
    expect(getByTestId('visible').props.children).toBe('false');
  });

  test('mounted stays true even after visible flips false (consumer must invoke onDismissed)', () => {
    let lastState: { visible: boolean; mounted: boolean } | null = null;
    const { getByTestId } = render(
      <Harness loading={false} onChange={(s) => { lastState = s; }} />
    );
    act(() => { jest.advanceTimersByTime(1200); });
    expect(getByTestId('visible').props.children).toBe('false');
    // Consumer must explicitly invoke onDismissed (simulating end-of-fade-out).
    // Without that, mounted is still true.
    expect(getByTestId('mounted').props.children).toBe('true');
    expect(lastState).not.toBeNull();
  });
});
