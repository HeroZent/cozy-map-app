import { render, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme/ThemeContext';
import { MoodPicker } from '@/compose/MoodPicker';

test('renders all 8 moods and emits onPick', () => {
  const onPick = jest.fn();
  const { getByText } = render(
    <ThemeProvider>
      <MoodPicker onPick={onPick} />
    </ThemeProvider>,
  );
  expect(getByText('Hopeful')).toBeTruthy();
  fireEvent.press(getByText('Hopeful'));
  expect(onPick).toHaveBeenCalledWith('hopeful');
});
