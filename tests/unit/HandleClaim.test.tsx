// tests/unit/HandleClaim.test.tsx
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme/ThemeContext';
import { HandleClaim } from '@/profile/HandleClaim';

// We need a reference to the eq mock so we can configure it per-test.
import { supabase } from '@/data/supabase';

jest.mock('@/data/supabase', () => ({
  supabase: {
    from: jest.fn().mockReturnValue({
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      }),
    }),
  },
}));

function wrap(ui: React.ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

function getEqMock() {
  // Navigate the mock chain to reach the innermost eq mock.
  return (supabase.from as jest.Mock)().update().eq as jest.Mock;
}

beforeEach(() => {
  getEqMock().mockResolvedValue({ error: null });
});

test('shows validation error for a handle that is too short', async () => {
  const { getByPlaceholderText, getByText } = wrap(
    <HandleClaim userId="u1" onClaimed={jest.fn()} />
  );
  fireEvent.changeText(getByPlaceholderText('e.g. cozy_writer'), 'ab');
  fireEvent.press(getByText('Claim handle'));
  await waitFor(() => {
    expect(getByText('3–20 chars, letters, numbers, and underscores only')).toBeTruthy();
  });
});

test('shows validation error for a handle with spaces', async () => {
  const { getByPlaceholderText, getByText } = wrap(
    <HandleClaim userId="u1" onClaimed={jest.fn()} />
  );
  fireEvent.changeText(getByPlaceholderText('e.g. cozy_writer'), 'hello world');
  fireEvent.press(getByText('Claim handle'));
  await waitFor(() => {
    expect(getByText('3–20 chars, letters, numbers, and underscores only')).toBeTruthy();
  });
});

test('calls onClaimed with the trimmed handle on success', async () => {
  const onClaimed = jest.fn();
  const { getByPlaceholderText, getByText } = wrap(
    <HandleClaim userId="u1" onClaimed={onClaimed} />
  );
  fireEvent.changeText(getByPlaceholderText('e.g. cozy_writer'), ' valid_handle ');
  fireEvent.press(getByText('Claim handle'));
  await waitFor(() => {
    expect(onClaimed).toHaveBeenCalledWith('valid_handle');
  });
});

test('shows "already taken" for a unique_violation DB error', async () => {
  getEqMock().mockResolvedValue({ error: { code: '23505', message: 'unique violation' } });
  const { getByPlaceholderText, getByText } = wrap(
    <HandleClaim userId="u1" onClaimed={jest.fn()} />
  );
  fireEvent.changeText(getByPlaceholderText('e.g. cozy_writer'), 'taken_handle');
  fireEvent.press(getByText('Claim handle'));
  await waitFor(() => {
    expect(getByText('that handle is already taken')).toBeTruthy();
  });
});
