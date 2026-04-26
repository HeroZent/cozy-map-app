import React from 'react';
import { Text } from 'react-native';
import { render } from '@testing-library/react-native';
import { StoryCardShell } from '../StoryCardShell';

jest.mock('expo-linear-gradient', () => {
  const { View } = require('react-native');
  const mockReact = require('react');
  return {
    LinearGradient: ({ children, style }: { children: unknown; style: object }) =>
      mockReact.createElement(View, { style }, children),
  };
});

const ids: Array<'a' | 'b' | 'c' | 'd' | 'e'> = ['a', 'b', 'c', 'd', 'e'];

for (const id of ids) {
  test(`renders children for style ${id}`, () => {
    const { getByText } = render(
      <StoryCardShell cardStyle={id}>
        <Text>child content</Text>
      </StoryCardShell>,
    );
    expect(getByText('child content')).toBeTruthy();
  });
}

test('renders without crashing for unknown style (fallback to a)', () => {
  const { getByText } = render(
    // @ts-expect-error intentional bad style
    <StoryCardShell cardStyle="z">
      <Text>fallback</Text>
    </StoryCardShell>,
  );
  expect(getByText('fallback')).toBeTruthy();
});
