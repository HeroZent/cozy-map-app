import React, { createRef } from 'react';
import { Text } from 'react-native';
import { render } from '@testing-library/react-native';
import { AnimatedSheet, type AnimatedSheetRef } from '../AnimatedSheet';

test('renders children', () => {
  const { getByText } = render(
    <AnimatedSheet>
      <Text>sheet content</Text>
    </AnimatedSheet>,
  );
  expect(getByText('sheet content')).toBeTruthy();
});

test('exposes open and close via ref', () => {
  const ref = createRef<AnimatedSheetRef>();
  render(
    <AnimatedSheet ref={ref}>
      <Text>content</Text>
    </AnimatedSheet>,
  );
  expect(typeof ref.current?.open).toBe('function');
  expect(typeof ref.current?.close).toBe('function');
});

test('open() via ref does not throw', () => {
  const ref = createRef<AnimatedSheetRef>();
  render(
    <AnimatedSheet ref={ref}>
      <Text>content</Text>
    </AnimatedSheet>,
  );
  expect(() => ref.current?.open()).not.toThrow();
});
