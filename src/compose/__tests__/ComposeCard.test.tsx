import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ComposeCard } from '../ComposeCard';

jest.mock('expo-linear-gradient', () => {
  const { View } = require('react-native');
  const mockReact = require('react');
  return {
    LinearGradient: ({ children, style }: { children: unknown; style: object }) =>
      mockReact.createElement(View, { style }, children),
  };
});

test('renders TextInput with provided value', () => {
  const { getByDisplayValue } = render(
    <ComposeCard
      cardStyle="a"
      value="naol masaya"
      onChangeText={() => {}}
      placeholder="What's on your mind?"
      locationLabel="Manila"
      maxLength={500}
    />,
  );
  expect(getByDisplayValue('naol masaya')).toBeTruthy();
});

test('calls onChangeText when text changes', () => {
  const onChangeText = jest.fn();
  const { getByDisplayValue } = render(
    <ComposeCard
      cardStyle="a"
      value="hello"
      onChangeText={onChangeText}
      placeholder="Write here"
      locationLabel={null}
      maxLength={500}
    />,
  );
  fireEvent.changeText(getByDisplayValue('hello'), 'hello world');
  expect(onChangeText).toHaveBeenCalledWith('hello world');
});

test('renders postmark when locationLabel provided for style a', () => {
  const { getByText } = render(
    <ComposeCard
      cardStyle="a"
      value=""
      onChangeText={() => {}}
      placeholder="Write"
      locationLabel="Valenzuela, Metro Manila"
      maxLength={500}
    />,
  );
  expect(getByText(/VALENZUELA/)).toBeTruthy();
});

test('does not render postmark for style b', () => {
  const { queryByText } = render(
    <ComposeCard
      cardStyle="b"
      value=""
      onChangeText={() => {}}
      placeholder="Write"
      locationLabel="Valenzuela, Metro Manila"
      maxLength={500}
    />,
  );
  expect(queryByText(/VALENZUELA/)).toBeNull();
});
