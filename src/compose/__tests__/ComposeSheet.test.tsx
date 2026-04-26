import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { ComposeSheet } from '../ComposeSheet';

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn().mockResolvedValue({ status: 'denied' }),
  getCurrentPositionAsync: jest.fn(),
}));

jest.mock('expo-linear-gradient', () => {
  const { View } = require('react-native');
  return {
    LinearGradient: ({ children, style }: { children: React.ReactNode; style: object }) =>
      require('react').createElement(View, { style }, children),
  };
});

jest.mock('@/data/useUser', () => ({
  useUser: () => ({
    user: { id: 'u1', display_handle: null, preferred_card_style: 'b' as const },
    loading: false,
    error: null,
  }),
}));

jest.mock('@/data/useCreateStory', () => ({
  useCreateStory: () => jest.fn().mockResolvedValue('story-123'),
}));

jest.mock('@/lib/reverseGeocode', () => ({
  reverseGeocode: jest.fn().mockResolvedValue(null),
}));

test('renders style picker swatches', () => {
  const { getByTestId } = render(<ComposeSheet onClose={jest.fn()} />);
  expect(getByTestId('style-swatch-a')).toBeTruthy();
});

test('initialises style picker from user preferred_card_style', async () => {
  const { getByTestId } = render(<ComposeSheet onClose={jest.fn()} />);
  await waitFor(() => {
    const swatch = getByTestId('style-swatch-b');
    // The selected swatch should have the gold ring style applied
    const styleArr = swatch.props.style;
    const flat = Array.isArray(styleArr) ? styleArr.flat(Infinity).filter(Boolean) : [styleArr];
    const hasGoldBorder = flat.some(
      (s: Record<string, unknown>) => typeof s === 'object' && s !== null && s.borderColor === '#f4c97a',
    );
    expect(hasGoldBorder).toBe(true);
  });
});
