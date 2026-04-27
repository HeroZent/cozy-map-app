// src/profile/__tests__/MySulatRow.test.tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { MySulatRow } from '../MySulatRow';
import type { MyStory } from '../useMyStories';

jest.mock('@/theme/ThemeContext', () => ({
  useTheme: () => ({
    surface: '#1a1a2e',
    textPrimary: '#fff',
    textMuted: '#888',
    accent: '#f4c97a',
    pinMemory: { body: '#d4a96a', glow: '#d4a96a', decoration: '✦' },
    id: 'lantern',
    name: 'Lantern Glow',
    description: '',
    mapStyle: '',
    background: '#0a0e22',
    fontFamily: 'serif',
    pin: { glow: '#f4c97a', body: '#f4c97a', pulseDuration: 2000 },
    heatmap: [],
    reactionTint: '#f4c97a',
  }),
}));

const baseStory: MyStory = {
  id: 'story-1',
  body: 'Hello world',
  location_label: 'Manila',
  created_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(), // 8 days ago
  reaction_count: 0,
  reply_count: 0,
  lat: 14.5995,
  lng: 120.9842,
  is_memory: false,
};

describe('MySulatRow', () => {
  it('does not show memory badge when is_memory is false', () => {
    const { queryByText } = render(
      <MySulatRow story={baseStory} isUnread={false} onNavigate={jest.fn()} />,
    );
    expect(queryByText('✦ memory')).toBeNull();
  });

  it('shows memory badge when is_memory is true', () => {
    const { getByText } = render(
      <MySulatRow
        story={{ ...baseStory, is_memory: true }}
        isUnread={false}
        onNavigate={jest.fn()}
      />,
    );
    expect(getByText('✦ memory')).toBeTruthy();
  });

  it('shows both reaction badge and memory badge simultaneously', () => {
    const { getByText } = render(
      <MySulatRow
        story={{ ...baseStory, is_memory: true, reaction_count: 3 }}
        isUnread={false}
        onNavigate={jest.fn()}
      />,
    );
    expect(getByText('✦ 3')).toBeTruthy();
    expect(getByText('✦ memory')).toBeTruthy();
  });

  it('does not render an X button when onDelete is not provided', () => {
    const { queryByTestId } = render(
      <MySulatRow story={baseStory} isUnread={false} onNavigate={jest.fn()} />,
    );
    expect(queryByTestId('delete-sulat-button')).toBeNull();
  });

  it('renders an X button when onDelete is provided', () => {
    const { getByTestId } = render(
      <MySulatRow
        story={baseStory}
        isUnread={false}
        onNavigate={jest.fn()}
        onDelete={jest.fn()}
      />,
    );
    expect(getByTestId('delete-sulat-button')).toBeTruthy();
  });

  it('calls onDelete when the X button is pressed', () => {
    const onDelete = jest.fn();
    const { getByTestId } = render(
      <MySulatRow
        story={baseStory}
        isUnread={false}
        onNavigate={jest.fn()}
        onDelete={onDelete}
      />,
    );
    fireEvent.press(getByTestId('delete-sulat-button'));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('does not call onNavigate when the X button is pressed', () => {
    const onNavigate = jest.fn();
    const onDelete = jest.fn();
    const { getByTestId } = render(
      <MySulatRow story={baseStory} isUnread={false} onNavigate={onNavigate} onDelete={onDelete} />,
    );
    fireEvent.press(getByTestId('delete-sulat-button'));
    expect(onNavigate).not.toHaveBeenCalled();
    expect(onDelete).toHaveBeenCalledTimes(1);
  });
});
