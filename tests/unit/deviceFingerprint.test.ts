import { getOrCreateFingerprint } from '@/data/deviceFingerprint';
import { kvSet } from '@/lib/persistence';

jest.mock('@/lib/persistence', () => {
  let store: Record<string, string> = {};
  return {
    kvGet: jest.fn(async (k: string) => store[k] ?? null),
    kvSet: jest.fn(async (k: string, v: string) => { store[k] = v; }),
    __resetStore: () => { store = {}; },
  };
});

describe('deviceFingerprint', () => {
  beforeEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (jest.requireMock('@/lib/persistence') as any).__resetStore();
    jest.clearAllMocks();
  });

  test('generates a UUID on first call', async () => {
    const fp = await getOrCreateFingerprint();
    expect(fp).toMatch(/^[0-9a-f-]{36}$/);
    expect(kvSet).toHaveBeenCalledWith('sulat.deviceFingerprint', fp);
  });

  test('returns same UUID on subsequent calls', async () => {
    const fp1 = await getOrCreateFingerprint();
    const fp2 = await getOrCreateFingerprint();
    expect(fp1).toBe(fp2);
  });
});
