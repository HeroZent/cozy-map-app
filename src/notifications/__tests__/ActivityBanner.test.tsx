// src/notifications/__tests__/ActivityBanner.test.tsx
import React from 'react';
import { render, act, waitFor } from '@testing-library/react-native';
import { ActivityBanner } from '../ActivityBanner';

jest.mock('@/theme/ThemeContext', () => ({
  useTheme: () => ({
    surface: '#1a1d2e',
    accent: '#f4c97a',
  }),
}));

describe('ActivityBanner', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders null when activityCount is 0', () => {
    const { queryByText } = render(
      <ActivityBanner activityCount={0} replyCount={0} reactionCount={0} />,
    );
    expect(queryByText(/💬/)).toBeNull();
  });

  it('shows singular reply label', () => {
    const { getByText } = render(
      <ActivityBanner activityCount={1} replyCount={1} reactionCount={0} />,
    );
    expect(getByText('💬 1 new reply')).toBeTruthy();
  });

  it('shows plural reply label', () => {
    const { getByText } = render(
      <ActivityBanner activityCount={3} replyCount={3} reactionCount={0} />,
    );
    expect(getByText('💬 3 new replies')).toBeTruthy();
  });

  it('shows singular reaction label', () => {
    const { getByText } = render(
      <ActivityBanner activityCount={1} replyCount={0} reactionCount={1} />,
    );
    expect(getByText('💬 1 reaction')).toBeTruthy();
  });

  it('shows plural reaction label', () => {
    const { getByText } = render(
      <ActivityBanner activityCount={2} replyCount={0} reactionCount={2} />,
    );
    expect(getByText('💬 2 reactions')).toBeTruthy();
  });

  it('shows combined label with both counts', () => {
    const { getByText } = render(
      <ActivityBanner activityCount={5} replyCount={3} reactionCount={2} />,
    );
    expect(getByText('💬 3 new replies · 2 reactions')).toBeTruthy();
  });

  it('auto-dismisses after 4 seconds', async () => {
    const { getByText, queryByText } = render(
      <ActivityBanner activityCount={2} replyCount={2} reactionCount={0} />,
    );
    expect(getByText('💬 2 new replies')).toBeTruthy();
    act(() => {
      jest.advanceTimersByTime(4000);
    });
    await waitFor(() => expect(queryByText('💬 2 new replies')).toBeNull());
  });
});
