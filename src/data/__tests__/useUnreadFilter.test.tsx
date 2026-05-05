import { render, act, waitFor } from '@testing-library/react-native';
import { Text, View } from 'react-native';
import { useUnreadFilter } from '../useUnreadFilter';

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

function Harness({ onApi }: { onApi: (api: ReturnType<typeof useUnreadFilter>) => void }) {
  const api = useUnreadFilter();
  onApi(api);
  return (
    <View>
      <Text testID="hydrating">{String(api.hydrating)}</Text>
      <Text testID="unreadOnly">{String(api.unreadOnly)}</Text>
    </View>
  );
}

describe('useUnreadFilter', () => {
  test('starts with hydrating=true and unreadOnly=false', () => {
    const apiRef: ReturnType<typeof useUnreadFilter>[] = [];
    const { getByTestId } = render(<Harness onApi={(api) => apiRef.push(api)} />);
    expect(getByTestId('hydrating').props.children).toBe('true');
    expect(getByTestId('unreadOnly').props.children).toBe('false');
  });

  test('hydrates unreadOnly=true when persisted', async () => {
    store['sulat.filters.unreadOnly'] = 'true';
    const apiRef: ReturnType<typeof useUnreadFilter>[] = [];
    const { getByTestId } = render(<Harness onApi={(api) => apiRef.push(api)} />);
    await waitFor(() => expect(getByTestId('hydrating').props.children).toBe('false'));
    expect(getByTestId('unreadOnly').props.children).toBe('true');
  });

  test('hydrates unreadOnly=false when persisted as anything other than "true"', async () => {
    store['sulat.filters.unreadOnly'] = 'false';
    const apiRef: ReturnType<typeof useUnreadFilter>[] = [];
    const { getByTestId } = render(<Harness onApi={(api) => apiRef.push(api)} />);
    await waitFor(() => expect(getByTestId('hydrating').props.children).toBe('false'));
    expect(getByTestId('unreadOnly').props.children).toBe('false');
  });

  test('toggle flips state and persists', async () => {
    const apiRef: ReturnType<typeof useUnreadFilter>[] = [];
    const { getByTestId } = render(<Harness onApi={(api) => apiRef.push(api)} />);
    await waitFor(() => expect(getByTestId('hydrating').props.children).toBe('false'));
    await act(async () => {
      await apiRef[apiRef.length - 1].toggle();
    });
    expect(getByTestId('unreadOnly').props.children).toBe('true');
    expect(store['sulat.filters.unreadOnly']).toBe('true');
    await act(async () => {
      await apiRef[apiRef.length - 1].toggle();
    });
    expect(getByTestId('unreadOnly').props.children).toBe('false');
    expect(store['sulat.filters.unreadOnly']).toBe('false');
  });
});
