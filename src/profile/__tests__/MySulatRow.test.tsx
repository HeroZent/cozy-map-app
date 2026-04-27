// src/profile/__tests__/MySulatRow.test.tsx
import React from 'react';
import { render } from '@testing-library/react-native';
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
});
