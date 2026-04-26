import { render, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme/ThemeContext';
import { MoodPicker } from '@/compose/MoodPicker';

const MOOD_NAMES = ['Regret', 'On my mind', 'Struggling', 'Hopeful', 'Memory', 'Dream', 'Unsent letter', 'Forgiveness'];

test('renders all 8 moods and emits onPick', () => {
  const onPick = jest.fn();
  const { getByText, getAllByText } = render(
    <ThemeProvider>
      <MoodPicker onPick={onPick} />
    </ThemeProvider>,
  );
  for (const name of MOOD_NAMES) {
    expect(getByText(name)).toBeTruthy();
  }
  expect(getAllByText(/./)).toBeTruthy();
  fireEvent.press(getByText('Hopeful'));
  expect(onPick).toHaveBeenCalledWith('hopeful');
});
