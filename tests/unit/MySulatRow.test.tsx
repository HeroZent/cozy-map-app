// tests/unit/MySulatRow.test.tsx
import { render, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme/ThemeContext';
import { MySulatRow } from '@/profile/MySulatRow';
import type { MyStory } from '@/profile/useMyStories';

const BASE: MyStory = {
  id: 'story-1',
  body: 'hello from the map',
  location_label: 'Quezon City',
  created_at: new Date().toISOString(),
  reaction_count: 0,
  reply_count: 0,
  lat: 14.6,
  lng: 121.0,
};

function wrap(ui: React.ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

test('renders body text', () => {
  const { getByText } = wrap(
    <MySulatRow story={BASE} isUnread={false} onNavigate={jest.fn()} />
  );
  expect(getByText('hello from the map')).toBeTruthy();
});

test('renders location label', () => {
  const { getByText } = wrap(
    <MySulatRow story={BASE} isUnread={false} onNavigate={jest.fn()} />
  );
  expect(getByText(/Quezon City/)).toBeTruthy();
});

test('shows gold dot when isUnread is true', () => {
  const { getByText } = wrap(
    <MySulatRow story={BASE} isUnread={true} onNavigate={jest.fn()} />
  );
  expect(getByText('●')).toBeTruthy();
});

test('does not show dot when isUnread is false', () => {
  const { queryByText } = wrap(
    <MySulatRow story={BASE} isUnread={false} onNavigate={jest.fn()} />
  );
  expect(queryByText('●')).toBeNull();
});

test('shows reaction badge when reaction_count > 0', () => {
  const story = { ...BASE, reaction_count: 3 };
  const { getByText } = wrap(
    <MySulatRow story={story} isUnread={false} onNavigate={jest.fn()} />
  );
  expect(getByText('✦ 3')).toBeTruthy();
});

test('calls onNavigate when the row is pressed', () => {
  const onNavigate = jest.fn();
  const { getByText } = wrap(
    <MySulatRow story={BASE} isUnread={false} onNavigate={onNavigate} />
  );
  fireEvent.press(getByText('hello from the map'));
  expect(onNavigate).toHaveBeenCalledTimes(1);
});
