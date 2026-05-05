import { render, act, waitFor } from '@testing-library/react-native';
import { Text, View } from 'react-native';
import { MoodFilterProvider, useMoodFilter } from '../useMoodFilter';
import { MOODS } from '@/moods/catalog';

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

function Harness({ onApi }: { onApi: (api: ReturnType<typeof useMoodFilter>) => void }) {
  const api = useMoodFilter();
  onApi(api);
  return (
    <View>
      <Text testID="hydrating">{String(api.hydrating)}</Text>
      <Text testID="size">{api.selectedMoods.size}</Text>
    </View>
  );
}

function renderWithProvider() {
  const apiRef: ReturnType<typeof useMoodFilter>[] = [];
  const utils = render(
    <MoodFilterProvider>
      <Harness onApi={(api) => apiRef.push(api)} />
    </MoodFilterProvider>
  );
  return { ...utils, apiRef };
}

describe('useMoodFilter', () => {
  test('starts with hydrating=true and selectedMoods = all 8 (no override default)', () => {
    const { getByTestId } = renderWithProvider();
    expect(getByTestId('hydrating').props.children).toBe('true');
    expect(getByTestId('size').props.children).toBe(MOODS.length);
  });

  test('with no persisted state, post-hydration selectedMoods = all 8', async () => {
    const { getByTestId, apiRef } = renderWithProvider();
    await waitFor(() => expect(getByTestId('hydrating').props.children).toBe('false'));
    expect(getByTestId('size').props.children).toBe(MOODS.length);
    const api = apiRef[apiRef.length - 1];
    for (const m of MOODS) {
      expect(api.selectedMoods.has(m.id)).toBe(true);
    }
  });

  test('with persisted override + subset, post-hydration selectedMoods = subset', async () => {
    store['sulat.filters.moodsOverride'] = 'true';
    store['sulat.filters.moods'] = JSON.stringify(['hopeful', 'memory']);
    const { getByTestId, apiRef } = renderWithProvider();
    await waitFor(() => expect(getByTestId('hydrating').props.children).toBe('false'));
    expect(getByTestId('size').props.children).toBe(2);
    const api = apiRef[apiRef.length - 1];
    expect(api.selectedMoods.has('hopeful')).toBe(true);
    expect(api.selectedMoods.has('memory')).toBe(true);
    expect(api.selectedMoods.has('regret')).toBe(false);
  });

  test('with persisted moods but override=false, post-hydration ignores stored set (selectedMoods = all 8)', async () => {
    store['sulat.filters.moods'] = JSON.stringify(['hopeful']);
    // No override key — treated as false
    const { getByTestId } = renderWithProvider();
    await waitFor(() => expect(getByTestId('hydrating').props.children).toBe('false'));
    expect(getByTestId('size').props.children).toBe(MOODS.length);
  });

  test('toggle(mood) starting from no-override state removes that mood and sets override', async () => {
    const { getByTestId, apiRef } = renderWithProvider();
    await waitFor(() => expect(getByTestId('hydrating').props.children).toBe('false'));
    await act(async () => {
      await apiRef[apiRef.length - 1].toggle('memory');
    });
    expect(getByTestId('size').props.children).toBe(MOODS.length - 1);
    expect(store['sulat.filters.moodsOverride']).toBe('true');
    const stored: string[] = JSON.parse(store['sulat.filters.moods']);
    expect(stored).not.toContain('memory');
    expect(stored.length).toBe(MOODS.length - 1);
  });

  test('toggle(mood) twice (round-trip) returns to all-selected', async () => {
    const { getByTestId, apiRef } = renderWithProvider();
    await waitFor(() => expect(getByTestId('hydrating').props.children).toBe('false'));
    await act(async () => {
      await apiRef[apiRef.length - 1].toggle('memory');
    });
    await act(async () => {
      await apiRef[apiRef.length - 1].toggle('memory');
    });
    expect(getByTestId('size').props.children).toBe(MOODS.length);
  });

  test('reset() clears override and re-shows all moods', async () => {
    store['sulat.filters.moodsOverride'] = 'true';
    store['sulat.filters.moods'] = JSON.stringify(['hopeful']);
    const { getByTestId, apiRef } = renderWithProvider();
    await waitFor(() => expect(getByTestId('hydrating').props.children).toBe('false'));
    expect(getByTestId('size').props.children).toBe(1);
    await act(async () => {
      await apiRef[apiRef.length - 1].reset();
    });
    expect(getByTestId('size').props.children).toBe(MOODS.length);
    expect(store['sulat.filters.moodsOverride']).toBe('false');
  });

  test('useMoodFilter throws when used outside provider', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() =>
      render(<Harness onApi={() => {}} />)
    ).toThrow(/useMoodFilter must be used inside/);
    spy.mockRestore();
  });
});
