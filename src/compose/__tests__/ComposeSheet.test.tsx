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

const mockCreate = jest.fn().mockResolvedValue('story-123');
jest.mock('@/data/useCreateStory', () => ({
  useCreateStory: () => mockCreate,
}));

jest.mock('@/lib/reverseGeocode', () => ({
  reverseGeocode: jest.fn().mockResolvedValue(null),
}));

jest.mock('@/moderation/crisisTripwire', () => ({
  checkCrisis: jest.fn(),
}));

jest.mock('@/audio/useBackgroundMusic', () => ({
  useBackgroundMusic: () => ({
    isMuted: false,
    toggleMute: jest.fn(),
    skipTrack: jest.fn(),
    duck: jest.fn(),
    unduck: jest.fn(),
    currentTrackName: null,
    isAudioAvailable: false,
  }),
}));

jest.mock('@/moderation/HotlineOverlay', () => ({
  HotlineOverlay: ({
    visible,
    onContinue,
  }: {
    visible: boolean;
    onGetHelp: () => void;
    onContinue: () => void;
  }) => {
    const React = require('react');
    const { Text, Pressable } = require('react-native');
    if (!visible) return null;
    return React.createElement(
      React.Fragment,
      null,
      React.createElement(Text, null, 'HOTLINE_VISIBLE'),
      React.createElement(Pressable, { onPress: onContinue, testID: 'hotline-continue' },
        React.createElement(Text, null, 'Continue posting'),
      ),
    );
  },
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

test('shows hotline overlay when crisis phrase detected', async () => {
  const { checkCrisis } = require('@/moderation/crisisTripwire');
  (checkCrisis as jest.Mock).mockReturnValue(true);

  const { getByText, UNSAFE_getAllByType } = render(
    <ComposeSheet onClose={jest.fn()} coords={{ lat: 14.6, lng: 120.9 }} />,
  );

  // Fill body via the TextInput inside ComposeCard
  const { TextInput } = require('react-native');
  const inputs = UNSAFE_getAllByType(TextInput);
  fireEvent.changeText(inputs[0], 'I want to kill myself');

  // Press Post sulat
  fireEvent.press(getByText('Post sulat'));

  await waitFor(() => {
    expect(getByText('HOTLINE_VISIBLE')).toBeTruthy();
  });
});

test('does not show hotline overlay when no crisis phrase', async () => {
  const { checkCrisis } = require('@/moderation/crisisTripwire');
  (checkCrisis as jest.Mock).mockReturnValue(false);

  const { queryByText, getByText, UNSAFE_getAllByType } = render(
    <ComposeSheet onClose={jest.fn()} coords={{ lat: 14.6, lng: 120.9 }} />,
  );

  const { TextInput } = require('react-native');
  const inputs = UNSAFE_getAllByType(TextInput);
  fireEvent.changeText(inputs[0], 'feeling hopeful today');

  fireEvent.press(getByText('Post sulat'));

  await waitFor(() => {
    expect(queryByText('HOTLINE_VISIBLE')).toBeNull();
  });
});

test('pressing Continue posting after hotline overlay submits post with crisisHint', async () => {
  const { checkCrisis } = require('@/moderation/crisisTripwire');
  (checkCrisis as jest.Mock).mockReturnValue(true);
  mockCreate.mockClear();

  const { getByTestId, getByText, UNSAFE_getAllByType } = render(
    <ComposeSheet onClose={jest.fn()} coords={{ lat: 14.6, lng: 120.9 }} />,
  );

  const { TextInput } = require('react-native');
  const inputs = UNSAFE_getAllByType(TextInput);
  fireEvent.changeText(inputs[0], 'I want to kill myself');

  // Press Post — tripwire fires, overlay appears
  fireEvent.press(getByText('Post sulat'));
  await waitFor(() => expect(getByText('HOTLINE_VISIBLE')).toBeTruthy());

  // Press Continue posting — should call create with crisisHint: true
  fireEvent.press(getByTestId('hotline-continue'));

  await waitFor(() => {
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ crisisHint: true }),
    );
  });
});
