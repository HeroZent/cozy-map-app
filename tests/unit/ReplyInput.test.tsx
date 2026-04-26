import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme/ThemeContext';
import { ReplyInput } from '@/replies/ReplyInput';

function renderInput(onSubmit: jest.Mock) {
  return render(
    <ThemeProvider>
      <ReplyInput onSubmit={onSubmit} />
    </ThemeProvider>,
  );
}

test('send button does not call onSubmit when draft is empty', () => {
  const onSubmit = jest.fn().mockResolvedValue(undefined);
  const { getByText } = renderInput(onSubmit);
  fireEvent.press(getByText('↑'));
  expect(onSubmit).not.toHaveBeenCalled();
});

test('calls onSubmit with trimmed body on send', async () => {
  const onSubmit = jest.fn().mockResolvedValue(undefined);
  const { getByPlaceholderText, getByText } = renderInput(onSubmit);
  fireEvent.changeText(getByPlaceholderText('leave a reply…'), '  hello sulat  ');
  fireEvent.press(getByText('↑'));
  await waitFor(() => expect(onSubmit).toHaveBeenCalledWith('hello sulat'));
});

test('clears draft after successful submit', async () => {
  const onSubmit = jest.fn().mockResolvedValue(undefined);
  const { getByPlaceholderText, getByText } = renderInput(onSubmit);
  fireEvent.changeText(getByPlaceholderText('leave a reply…'), 'test reply');
  fireEvent.press(getByText('↑'));
  await waitFor(() => expect(getByPlaceholderText('leave a reply…').props.value).toBe(''));
});

test('shows error message and preserves draft when onSubmit throws', async () => {
  const onSubmit = jest.fn().mockRejectedValue(new Error('network error'));
  const { getByPlaceholderText, getByText } = renderInput(onSubmit);
  fireEvent.changeText(getByPlaceholderText('leave a reply…'), 'test reply');
  fireEvent.press(getByText('↑'));
  await waitFor(() => expect(getByText('network error')).toBeTruthy());
  expect(getByPlaceholderText('leave a reply…').props.value).toBe('test reply');
});

test('clears error when user types after failure', async () => {
  const onSubmit = jest.fn().mockRejectedValue(new Error('fail'));
  const { getByPlaceholderText, getByText, queryByText } = renderInput(onSubmit);
  fireEvent.changeText(getByPlaceholderText('leave a reply…'), 'test');
  fireEvent.press(getByText('↑'));
  await waitFor(() => expect(getByText('fail')).toBeTruthy());
  fireEvent.changeText(getByPlaceholderText('leave a reply…'), 'test2');
  expect(queryByText('fail')).toBeNull();
});

test('slices input to 300 characters', () => {
  const onSubmit = jest.fn().mockResolvedValue(undefined);
  const { getByPlaceholderText } = renderInput(onSubmit);
  const longText = 'a'.repeat(350);
  fireEvent.changeText(getByPlaceholderText('leave a reply…'), longText);
  expect(getByPlaceholderText('leave a reply…').props.value).toHaveLength(300);
});
