import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { View } from 'react-native';
import { SettingsSheet } from '../SettingsSheet';

jest.mock('@/components/AnimatedSheet', () => {
  const { View } = require('react-native');
  return {
    AnimatedSheet: ({ children, style }: any) => require('react').createElement(View, { style }, children),
  };
});

jest.mock('@/theme/ThemeContext', () => ({
  useTheme: () => ({
    surface: '#1a1a2e',
    accent: '#f4c97a',
    textMuted: '#888',
    textPrimary: '#fff',
    fontFamily: 'serif',
    id: 'lantern',
    name: 'Lantern Glow',
    description: '',
    mapStyle: '',
    background: '#0a0e22',
    pin: { glow: '#f4c97a', body: '#f4c97a', pulseDuration: 2000 },
    pinMemory: { body: '#d4a96a', glow: '#d4a96a', decoration: '✦' },
    heatmap: [],
    reactionTint: '#f4c97a',
  }),
}));

const mockSubscribe = jest.fn().mockResolvedValue(undefined);
const mockUnsubscribe = jest.fn().mockResolvedValue(undefined);
let mockPushState = {
  subscribed: false,
  loading: false,
  permissionDenied: false,
  subscribe: mockSubscribe,
  unsubscribe: mockUnsubscribe,
};

jest.mock('@/push/usePushSubscription', () => ({
  usePushSubscription: () => mockPushState,
}));

const baseProps = {
  onClose: jest.fn(),
  heatmapOn: true,
  onHeatmapToggle: jest.fn(),
};

describe('SettingsSheet push toggle', () => {
  beforeEach(() => {
    mockPushState = {
      subscribed: false,
      loading: false,
      permissionDenied: false,
      subscribe: mockSubscribe,
      unsubscribe: mockUnsubscribe,
    };
    mockSubscribe.mockClear();
    mockUnsubscribe.mockClear();
  });

  it('renders Push notifications label', () => {
    const { getByText } = render(<SettingsSheet {...baseProps} />);
    expect(getByText('Push notifications')).toBeTruthy();
  });

  it('shows switch when permissionDenied is false', () => {
    const { getByTestId } = render(<SettingsSheet {...baseProps} />);
    expect(getByTestId('push-notifications-switch')).toBeTruthy();
  });

  it('shows hint text and no switch when permissionDenied is true', () => {
    mockPushState = { ...mockPushState, permissionDenied: true };
    const { getByText, queryByTestId } = render(<SettingsSheet {...baseProps} />);
    expect(getByText('Enable in browser settings')).toBeTruthy();
    expect(queryByTestId('push-notifications-switch')).toBeNull();
  });

  it('calls subscribe when switch is toggled on', () => {
    const { getByTestId } = render(<SettingsSheet {...baseProps} />);
    fireEvent(getByTestId('push-notifications-switch'), 'valueChange', true);
    expect(mockSubscribe).toHaveBeenCalledTimes(1);
  });

  it('calls unsubscribe when switch is toggled off', () => {
    mockPushState = { ...mockPushState, subscribed: true };
    const { getByTestId } = render(<SettingsSheet {...baseProps} />);
    fireEvent(getByTestId('push-notifications-switch'), 'valueChange', false);
    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });

  it('switch is disabled when loading is true', () => {
    mockPushState = { ...mockPushState, loading: true };
    const { getByTestId } = render(<SettingsSheet {...baseProps} />);
    expect(getByTestId('push-notifications-switch').props.disabled).toBe(true);
  });
});
