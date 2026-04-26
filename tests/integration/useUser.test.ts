import { renderHook, waitFor } from '@testing-library/react-native';
import { useUser } from '@/data/useUser';

// This is an integration test — runs against the real Supabase project.
// Requires .env.local to be configured.

describe('useUser', () => {
  // Jest test timeout raised to 15 s to accommodate real Supabase round-trips.
  test('creates and returns a user on first call', async () => {
    const { result } = renderHook(() => useUser());
    await waitFor(() => expect(result.current.user).not.toBeNull(), { timeout: 10000 });
    expect(result.current.user!.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(result.current.user!.device_fingerprint).toBeTruthy();
  }, 15000);
});
