import { render, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme/ThemeContext';
import { StarToggle } from '../StarToggle';
import * as ReadStoriesModule from '@/data/useReadStories';

jest.mock('@/data/useReadStories');

const mockToggleStarred = jest.fn(() => Promise.resolve());

function mockApi(starredIds: string[]) {
  const set = new Set(starredIds);
  jest.spyOn(ReadStoriesModule, 'useReadStories').mockReturnValue({
    read: new Set<string>(),
    starred: set,
    hydrating: false,
    isRead: () => false,
    isStarred: (id: string) => set.has(id),
    markRead: jest.fn(),
    toggleStarred: mockToggleStarred,
  });
}

beforeEach(() => {
  mockToggleStarred.mockClear();
  jest.restoreAllMocks();
});

function withTheme(node: React.ReactNode) {
  return <ThemeProvider>{node}</ThemeProvider>;
}

describe('StarToggle', () => {
  test('renders an unstarred icon when story is not in starred set', () => {
    mockApi([]);
    const { getByTestId } = render(withTheme(<StarToggle storyId="s1" />));
    expect(getByTestId('star-toggle').props.accessibilityState?.selected).toBe(false);
  });

  test('renders a starred icon when story is in starred set', () => {
    mockApi(['s1']);
    const { getByTestId } = render(withTheme(<StarToggle storyId="s1" />));
    expect(getByTestId('star-toggle').props.accessibilityState?.selected).toBe(true);
  });

  test('tap calls toggleStarred with the story id', () => {
    mockApi([]);
    const { getByTestId } = render(withTheme(<StarToggle storyId="s1" />));
    fireEvent.press(getByTestId('star-toggle'));
    expect(mockToggleStarred).toHaveBeenCalledTimes(1);
    expect(mockToggleStarred).toHaveBeenCalledWith('s1');
  });
});
