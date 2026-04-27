import React from 'react';
import { render } from '@testing-library/react-native';
import { StoryCard } from '../StoryCard';

jest.mock('expo-linear-gradient', () => {
  const { View } = require('react-native');
  const mockReact = require('react');
  return {
    LinearGradient: ({ children, style }: { children: unknown; style: object }) =>
      mockReact.createElement(View, { style }, children),
  };
});

test('renders body text for style a', () => {
  const { getByText } = render(<StoryCard body="Hello world" cardStyle="a" />);
  expect(getByText('Hello world')).toBeTruthy();
});

test('renders body text for style b', () => {
  const { getByText } = render(<StoryCard body="candlelight note" cardStyle="b" />);
  expect(getByText('candlelight note')).toBeTruthy();
});

test('renders body text for style c', () => {
  const { getByText } = render(<StoryCard body="torn letter" cardStyle="c" />);
  expect(getByText('torn letter')).toBeTruthy();
});

test('renders body text for style d', () => {
  const { getByText } = render(<StoryCard body="midnight entry" cardStyle="d" />);
  expect(getByText('midnight entry')).toBeTruthy();
});

test('renders body text for style e', () => {
  const { getByText } = render(<StoryCard body="folded note" cardStyle="e" />);
  expect(getByText('folded note')).toBeTruthy();
});

test('applies Kalam font for style a', () => {
  const { getByText } = render(<StoryCard body="hello" cardStyle="a" />);
  const el = getByText('hello');
  const style = Array.isArray(el.props.style)
    ? Object.assign({}, ...el.props.style.flat(Infinity).filter(Boolean))
    : el.props.style;
  expect(style.fontFamily).toBe('Kalam');
});

test('applies Caveat font for style b', () => {
  const { getByText } = render(<StoryCard body="hello" cardStyle="b" />);
  const el = getByText('hello');
  const style = Array.isArray(el.props.style)
    ? Object.assign({}, ...el.props.style.flat(Infinity).filter(Boolean))
    : el.props.style;
  expect(style.fontFamily).toBe('Caveat');
});

test('falls back to style a for unknown cardStyle', () => {
  // @ts-expect-error — intentionally wrong type
  const { getByText } = render(<StoryCard body="fallback" cardStyle="z" />);
  expect(getByText('fallback')).toBeTruthy();
});

test('shows postmark for style a when locationLabel and createdAt provided', () => {
  const { getByText } = render(
    <StoryCard
      body="hello"
      cardStyle="a"
      locationLabel="Valenzuela, Metro Manila"
      createdAt="2026-04-27T00:00:00.000Z"
    />,
  );
  expect(getByText(/VALENZUELA/)).toBeTruthy();
});

test('does not show postmark for style b even with locationLabel', () => {
  const { queryByText } = render(
    <StoryCard
      body="hello"
      cardStyle="b"
      locationLabel="Valenzuela, Metro Manila"
      createdAt="2026-04-27T00:00:00.000Z"
    />,
  );
  expect(queryByText(/VALENZUELA/)).toBeNull();
});

test('does not show postmark when locationLabel is null', () => {
  const { queryByText } = render(
    <StoryCard
      body="hello"
      cardStyle="a"
      locationLabel={null}
      createdAt="2026-04-27T00:00:00.000Z"
    />,
  );
  expect(queryByText(/APR/)).toBeNull();
});
