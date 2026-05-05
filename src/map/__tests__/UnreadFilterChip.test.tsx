import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme/ThemeContext';
import { UnreadFilterChip } from '../UnreadFilterChip';
import * as UnreadFilterModule from '@/data/useUnreadFilter';

jest.mock('@/data/useUnreadFilter');

const mockToggle = jest.fn(() => Promise.resolve());

beforeEach(() => {
  mockToggle.mockClear();
  jest.spyOn(UnreadFilterModule, 'useUnreadFilter').mockReturnValue({
    unreadOnly: false,
    hydrating: false,
    toggle: mockToggle,
  });
});

function withTheme(node: React.ReactNode) {
  return <ThemeProvider>{node}</ThemeProvider>;
}

describe('UnreadFilterChip', () => {
  test('renders with the inactive label "Unread"', () => {
    const { getByText } = render(withTheme(<UnreadFilterChip />));
    expect(getByText('Unread')).toBeTruthy();
  });

  test('tap calls toggle', () => {
    const { getByTestId } = render(withTheme(<UnreadFilterChip />));
    fireEvent.press(getByTestId('unread-filter-chip'));
    expect(mockToggle).toHaveBeenCalledTimes(1);
  });

  test('active state passes the active flag to children styling', () => {
    jest.spyOn(UnreadFilterModule, 'useUnreadFilter').mockReturnValue({
      unreadOnly: true,
      hydrating: false,
      toggle: mockToggle,
    });
    const { getByTestId } = render(withTheme(<UnreadFilterChip />));
    const chip = getByTestId('unread-filter-chip');
    expect(chip.props.accessibilityState?.selected).toBe(true);
  });

  test('inactive state has accessibilityState.selected = false', () => {
    const { getByTestId } = render(withTheme(<UnreadFilterChip />));
    expect(getByTestId('unread-filter-chip').props.accessibilityState?.selected).toBe(false);
  });
});
