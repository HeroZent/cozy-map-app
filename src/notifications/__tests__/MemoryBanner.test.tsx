// src/notifications/__tests__/MemoryBanner.test.tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { MemoryBanner } from '../MemoryBanner';
import type { Notification } from '@/data/useNotifications';

jest.mock('@/theme/ThemeContext', () => ({
  useTheme: () => ({
    surface: '#1a1a2e',
    pinMemory: { body: '#d4a96a', glow: '#d4a96a', decoration: '✦' },
    accent: '#f4c97a',
    textMuted: '#888',
    textPrimary: '#fff',
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

const memoryNotif = (id: string, storyId: string): Notification => ({
  id,
  type: 'memory_promoted',
  story_id: storyId,
  payload: {},
  created_at: '2026-04-20T00:00:00Z',
});

describe('MemoryBanner', () => {
  it('renders nothing when memoryCount is 0', () => {
    const { queryByText } = render(
      <MemoryBanner notifications={[]} memoryCount={0} markRead={jest.fn()} />,
    );
    expect(queryByText(/sulat/)).toBeNull();
  });

  it('shows singular text when exactly one memory', () => {
    const { getByText } = render(
      <MemoryBanner
        notifications={[memoryNotif('n1', 's1')]}
        memoryCount={1}
        markRead={jest.fn()}
      />,
    );
    expect(getByText('✦ One of your sulat became a memory')).toBeTruthy();
  });

  it('shows plural text when more than one memory', () => {
    const { getByText } = render(
      <MemoryBanner
        notifications={[memoryNotif('n1', 's1'), memoryNotif('n2', 's2')]}
        memoryCount={2}
        markRead={jest.fn()}
      />,
    );
    expect(getByText('✦ 2 of your sulat became memories')).toBeTruthy();
  });

  it('calls markRead with all memory notification IDs when tapped', () => {
    const mockMarkRead = jest.fn().mockResolvedValue(undefined);
    const { getByText } = render(
      <MemoryBanner
        notifications={[memoryNotif('n1', 's1'), memoryNotif('n2', 's2')]}
        memoryCount={2}
        markRead={mockMarkRead}
      />,
    );
    fireEvent.press(getByText('✦ 2 of your sulat became memories'));
    expect(mockMarkRead).toHaveBeenCalledWith(['n1', 'n2']);
  });
});
