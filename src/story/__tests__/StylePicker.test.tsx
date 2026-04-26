import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { StylePicker } from '../StylePicker';

test('renders 5 swatches', () => {
  const { getAllByRole } = render(
    <StylePicker selected="a" onSelect={jest.fn()} />,
  );
  expect(getAllByRole('button')).toHaveLength(5);
});

test('calls onSelect with the tapped style id', () => {
  const onSelect = jest.fn();
  const { getByTestId } = render(
    <StylePicker selected="a" onSelect={onSelect} />,
  );
  fireEvent.press(getByTestId('style-swatch-b'));
  expect(onSelect).toHaveBeenCalledWith('b');
});

test('calls onSelect for each style', () => {
  const ids: Array<'a' | 'b' | 'c' | 'd' | 'e'> = ['a', 'b', 'c', 'd', 'e'];
  for (const id of ids) {
    const onSelect = jest.fn();
    const { getByTestId } = render(
      <StylePicker selected="a" onSelect={onSelect} />,
    );
    fireEvent.press(getByTestId(`style-swatch-${id}`));
    expect(onSelect).toHaveBeenCalledWith(id);
  }
});

test('shows label for selected style when showLabel is true', () => {
  const { getByText } = render(
    <StylePicker selected="a" onSelect={jest.fn()} showLabel />,
  );
  expect(getByText('Warm Parchment')).toBeTruthy();
});

test('does not show label when showLabel is false', () => {
  const { queryByText } = render(
    <StylePicker selected="a" onSelect={jest.fn()} />,
  );
  expect(queryByText('Warm Parchment')).toBeNull();
});

test('label updates when selected changes', () => {
  const { getByText } = render(
    <StylePicker selected="b" onSelect={jest.fn()} showLabel />,
  );
  expect(getByText('Dark Candlelight')).toBeTruthy();
});
