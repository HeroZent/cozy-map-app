import { render, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme/ThemeContext';
import { TextEditor } from '@/compose/TextEditor';

test('rejects strings over 1000 chars', () => {
  const onContinue = jest.fn();
  const { getByPlaceholderText, getByText, queryByText } = render(
    <ThemeProvider>
      <TextEditor mood="hopeful" onContinue={onContinue} />
    </ThemeProvider>,
  );
  const input = getByPlaceholderText(/.*/);
  fireEvent.changeText(input, 'a'.repeat(1001));
  fireEvent.press(getByText('Continue →'));
  expect(onContinue).not.toHaveBeenCalled();
  expect(queryByText(/Too long/)).toBeTruthy();
});

test('calls onContinue with valid text', () => {
  const onContinue = jest.fn();
  const { getByPlaceholderText, getByText } = render(
    <ThemeProvider>
      <TextEditor mood="hopeful" onContinue={onContinue} />
    </ThemeProvider>,
  );
  fireEvent.changeText(getByPlaceholderText(/.*/), 'A small win today.');
  fireEvent.press(getByText('Continue →'));
  expect(onContinue).toHaveBeenCalledWith('A small win today.');
});
