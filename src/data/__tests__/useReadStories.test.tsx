import { render, act, waitFor } from '@testing-library/react-native';
import { Text, View } from 'react-native';
import { useReadStories, ReadStoriesProvider } from '../useReadStories';

const store: Record<string, string> = {};

jest.mock('@/lib/persistence', () => ({
  kvGet: jest.fn((k: string) => Promise.resolve(store[k] ?? null)),
  kvSet: jest.fn((k: string, v: string) => {
    store[k] = v;
    return Promise.resolve();
  }),
}));

beforeEach(() => {
  Object.keys(store).forEach((k) => delete store[k]);
});

function Harness({ onApi }: { onApi: (api: ReturnType<typeof useReadStories>) => void }) {
  const api = useReadStories();
  onApi(api);
  return (
    <View>
      <Text testID="hydrating">{String(api.hydrating)}</Text>
      <Text testID="readSize">{api.read.size}</Text>
      <Text testID="starredSize">{api.starred.size}</Text>
    </View>
  );
}

describe('useReadStories', () => {
  test('starts with hydrating=true and empty sets', () => {
    const apiRef: ReturnType<typeof useReadStories>[] = [];
    const { getByTestId } = render(<ReadStoriesProvider><Harness onApi={(api) => apiRef.push(api)} /></ReadStoriesProvider>);
    expect(getByTestId('hydrating').props.children).toBe('true');
    expect(getByTestId('readSize').props.children).toBe(0);
    expect(getByTestId('starredSize').props.children).toBe(0);
  });

  test('hydrates from kvGet on mount; hydrating flips false', async () => {
    store['sulat.read'] = JSON.stringify(['s1', 's2']);
    store['sulat.starred'] = JSON.stringify(['s3']);
    const apiRef: ReturnType<typeof useReadStories>[] = [];
    const { getByTestId } = render(<ReadStoriesProvider><Harness onApi={(api) => apiRef.push(api)} /></ReadStoriesProvider>);
    await waitFor(() => expect(getByTestId('hydrating').props.children).toBe('false'));
    expect(getByTestId('readSize').props.children).toBe(2);
    expect(getByTestId('starredSize').props.children).toBe(1);
    const latest = apiRef[apiRef.length - 1];
    expect(latest.isRead('s1')).toBe(true);
    expect(latest.isRead('s2')).toBe(true);
    expect(latest.isRead('s3')).toBe(false);
    expect(latest.isStarred('s3')).toBe(true);
  });

  test('hydration tolerates malformed JSON without throwing', async () => {
    store['sulat.read'] = 'not valid json {';
    const apiRef: ReturnType<typeof useReadStories>[] = [];
    const { getByTestId } = render(<ReadStoriesProvider><Harness onApi={(api) => apiRef.push(api)} /></ReadStoriesProvider>);
    await waitFor(() => expect(getByTestId('hydrating').props.children).toBe('false'));
    expect(getByTestId('readSize').props.children).toBe(0);
  });

  test('markRead adds to set and persists', async () => {
    const apiRef: ReturnType<typeof useReadStories>[] = [];
    const { getByTestId } = render(<ReadStoriesProvider><Harness onApi={(api) => apiRef.push(api)} /></ReadStoriesProvider>);
    await waitFor(() => expect(getByTestId('hydrating').props.children).toBe('false'));
    await act(async () => {
      await apiRef[apiRef.length - 1].markRead('story-a');
    });
    expect(getByTestId('readSize').props.children).toBe(1);
    expect(JSON.parse(store['sulat.read'])).toEqual(['story-a']);
  });

  test('markRead is idempotent — calling twice does not duplicate', async () => {
    const apiRef: ReturnType<typeof useReadStories>[] = [];
    const { getByTestId } = render(<ReadStoriesProvider><Harness onApi={(api) => apiRef.push(api)} /></ReadStoriesProvider>);
    await waitFor(() => expect(getByTestId('hydrating').props.children).toBe('false'));
    await act(async () => {
      await apiRef[apiRef.length - 1].markRead('story-a');
    });
    await act(async () => {
      await apiRef[apiRef.length - 1].markRead('story-a');
    });
    expect(getByTestId('readSize').props.children).toBe(1);
  });

  test('toggleStarred adds then removes', async () => {
    const apiRef: ReturnType<typeof useReadStories>[] = [];
    const { getByTestId } = render(<ReadStoriesProvider><Harness onApi={(api) => apiRef.push(api)} /></ReadStoriesProvider>);
    await waitFor(() => expect(getByTestId('hydrating').props.children).toBe('false'));
    await act(async () => {
      await apiRef[apiRef.length - 1].toggleStarred('story-x');
    });
    expect(getByTestId('starredSize').props.children).toBe(1);
    expect(JSON.parse(store['sulat.starred'])).toEqual(['story-x']);
    await act(async () => {
      await apiRef[apiRef.length - 1].toggleStarred('story-x');
    });
    expect(getByTestId('starredSize').props.children).toBe(0);
    expect(JSON.parse(store['sulat.starred'])).toEqual([]);
  });
});
