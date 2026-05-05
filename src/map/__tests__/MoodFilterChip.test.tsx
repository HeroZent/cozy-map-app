import { render, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme/ThemeContext';
import { MoodFilterChip } from '../MoodFilterChip';
import * as MoodFilterModule from '@/data/useMoodFilter';
import { MOODS } from '@/moods/catalog';
import type { Mood } from '@/data/types';

jest.mock('@/data/useMoodFilter');

const ALL_MOODS: Set<Mood> = new Set(MOODS.map((m) => m.id));
const SUBSET_MOODS: Set<Mood> = new Set(['hopeful', 'memory'] as Mood[]);

function setHookReturn(selectedMoods: Set<Mood>, hasOverride: boolean) {
  jest.spyOn(MoodFilterModule, 'useMoodFilter').mockReturnValue({
    selectedMoods,
    hydrating: false,
    hasOverride,
    toggle: jest.fn(),
    reset: jest.fn(),
  });
}

beforeEach(() => {
  jest.restoreAllMocks();
});

function withTheme(node: React.ReactNode) {
  return <ThemeProvider>{node}</ThemeProvider>;
}

describe('MoodFilterChip', () => {
  test('renders the label "Moods"', () => {
    setHookReturn(ALL_MOODS, false);
    const { getByText } = render(
      withTheme(<MoodFilterChip onOpen={() => {}} />)
    );
    expect(getByText('Moods')).toBeTruthy();
  });

  test('inactive when all moods selected (no override) — accessibilityState.selected = false', () => {
    setHookReturn(ALL_MOODS, false);
    const { getByTestId } = render(
      withTheme(<MoodFilterChip onOpen={() => {}} />)
    );
    expect(getByTestId('mood-filter-chip').props.accessibilityState?.selected).toBe(false);
  });

  test('active when fewer than all moods selected — accessibilityState.selected = true', () => {
    setHookReturn(SUBSET_MOODS, true);
    const { getByTestId } = render(
      withTheme(<MoodFilterChip onOpen={() => {}} />)
    );
    expect(getByTestId('mood-filter-chip').props.accessibilityState?.selected).toBe(true);
  });

  test('tap calls onOpen', () => {
    setHookReturn(ALL_MOODS, false);
    const onOpen = jest.fn();
    const { getByTestId } = render(
      withTheme(<MoodFilterChip onOpen={onOpen} />)
    );
    fireEvent.press(getByTestId('mood-filter-chip'));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });
});
