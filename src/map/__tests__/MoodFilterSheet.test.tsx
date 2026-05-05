import { render, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme/ThemeContext';
import { MoodFilterSheet } from '../MoodFilterSheet';
import * as MoodFilterModule from '@/data/useMoodFilter';
import { MOODS } from '@/moods/catalog';
import type { Mood } from '@/data/types';

jest.mock('@/data/useMoodFilter');

const ALL_MOODS: Set<Mood> = new Set(MOODS.map((m) => m.id));

const mockToggle = jest.fn(() => Promise.resolve());
const mockReset = jest.fn(() => Promise.resolve());

function setHookReturn(selectedMoods: Set<Mood>, hasOverride: boolean) {
  jest.spyOn(MoodFilterModule, 'useMoodFilter').mockReturnValue({
    selectedMoods,
    hydrating: false,
    hasOverride,
    toggle: mockToggle,
    reset: mockReset,
  });
}

beforeEach(() => {
  mockToggle.mockClear();
  mockReset.mockClear();
  jest.restoreAllMocks();
});

function withTheme(node: React.ReactNode) {
  return <ThemeProvider>{node}</ThemeProvider>;
}

describe('MoodFilterSheet', () => {
  test('renders nothing when open=false', () => {
    setHookReturn(ALL_MOODS, false);
    const { queryByText } = render(
      withTheme(<MoodFilterSheet open={false} onClose={() => {}} />)
    );
    expect(queryByText('Moods')).toBeNull();
  });

  test('renders header "Moods" + a row for every mood when open=true', () => {
    setHookReturn(ALL_MOODS, false);
    const { getByText } = render(
      withTheme(<MoodFilterSheet open={true} onClose={() => {}} />)
    );
    expect(getByText('Moods')).toBeTruthy();
    for (const m of MOODS) {
      expect(getByText(m.name)).toBeTruthy();
    }
  });

  test('tap on a mood row calls toggle(moodId)', () => {
    setHookReturn(ALL_MOODS, false);
    const { getByTestId } = render(
      withTheme(<MoodFilterSheet open={true} onClose={() => {}} />)
    );
    fireEvent.press(getByTestId('mood-filter-row-hopeful'));
    expect(mockToggle).toHaveBeenCalledWith('hopeful');
  });

  test('tap Reset calls reset()', () => {
    setHookReturn(new Set(['hopeful'] as Mood[]), true);
    const { getByTestId } = render(
      withTheme(<MoodFilterSheet open={true} onClose={() => {}} />)
    );
    fireEvent.press(getByTestId('mood-filter-reset'));
    expect(mockReset).toHaveBeenCalledTimes(1);
  });

  test('Reset is disabled when hasOverride=false (nothing to reset)', () => {
    setHookReturn(ALL_MOODS, false);
    const { getByTestId } = render(
      withTheme(<MoodFilterSheet open={true} onClose={() => {}} />)
    );
    expect(getByTestId('mood-filter-reset').props.accessibilityState?.disabled).toBe(true);
  });

  test('Reset is enabled when hasOverride=true', () => {
    setHookReturn(new Set(['hopeful'] as Mood[]), true);
    const { getByTestId } = render(
      withTheme(<MoodFilterSheet open={true} onClose={() => {}} />)
    );
    expect(getByTestId('mood-filter-reset').props.accessibilityState?.disabled).toBe(false);
  });
});
