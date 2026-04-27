// src/moderation/__tests__/HotlineOverlay.test.tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { HotlineOverlay } from '../HotlineOverlay';

jest.mock('@/theme/ThemeContext', () => ({
  useTheme: () => ({
    surface: '#1c1910',
    textPrimary: '#f0dfa8',
    textMuted: 'rgba(240,223,168,0.4)',
    accent: '#f4c97a',
    background: '#0d0b09',
  }),
}));

// Mock only Linking.openURL — importing individual APIs from react-native avoids
// spreading requireActual (which evaluates all lazy getters and throws on
// TurboModule stubs in RN 0.81+).
jest.mock('react-native/Libraries/Linking/Linking', () => ({
  __esModule: true,
  default: { openURL: jest.fn().mockResolvedValue(undefined) },
}));

test('renders title and both buttons when visible', () => {
  const { getByText } = render(
    <HotlineOverlay visible onGetHelp={jest.fn()} onContinue={jest.fn()} />,
  );
  expect(getByText('Someone sees you 🕯️')).toBeTruthy();
  expect(getByText('Get help now')).toBeTruthy();
  expect(getByText('Continue posting')).toBeTruthy();
  expect(getByText('Hopeline PH')).toBeTruthy();
  expect(getByText('0917-558-4673')).toBeTruthy();
});

test('returns null when not visible', () => {
  const { queryByText } = render(
    <HotlineOverlay visible={false} onGetHelp={jest.fn()} onContinue={jest.fn()} />,
  );
  expect(queryByText('Someone sees you 🕯️')).toBeNull();
});

test('calls onContinue when Continue posting pressed', () => {
  const onContinue = jest.fn();
  const { getByText } = render(
    <HotlineOverlay visible onGetHelp={jest.fn()} onContinue={onContinue} />,
  );
  fireEvent.press(getByText('Continue posting'));
  expect(onContinue).toHaveBeenCalledTimes(1);
});

test('calls onGetHelp when Get help now pressed', () => {
  const onGetHelp = jest.fn();
  const { getByText } = render(
    <HotlineOverlay visible onGetHelp={onGetHelp} onContinue={jest.fn()} />,
  );
  fireEvent.press(getByText('Get help now'));
  expect(onGetHelp).toHaveBeenCalledTimes(1);
});

test('opens Hopeline tel link when Get help now pressed', () => {
  const { Linking } = require('react-native');
  const { getByText } = render(
    <HotlineOverlay visible onGetHelp={jest.fn()} onContinue={jest.fn()} />,
  );
  fireEvent.press(getByText('Get help now'));
  expect(Linking.openURL).toHaveBeenCalledWith('tel:09175584673');
});
