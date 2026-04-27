// src/push/__tests__/usePushSubscription.test.tsx
import React from 'react';
import { render, waitFor, act } from '@testing-library/react-native';
import { Text } from 'react-native';

// ── Supabase mock ─────────────────────────────────────────────────────────────

let mockUserId: string | null = 'user-1';
let mockSubData: { endpoint: string } | null = null;
let mockSubError: { message: string } | null = null;
const mockUpsert = jest.fn().mockResolvedValue({ error: null });
const mockDeleteEq = jest.fn().mockResolvedValue({ error: null });

jest.mock('@/data/supabase', () => ({
  supabase: {
    auth: {
      getSession: () =>
        Promise.resolve({
          data: {
            session: mockUserId ? { user: { id: mockUserId } } : null,
          },
        }),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: () =>
            Promise.resolve({ data: mockSubData, error: mockSubError }),
        }),
      }),
      upsert: mockUpsert,
      delete: () => ({ eq: mockDeleteEq }),
    }),
  },
}));

// ── Browser API mocks ─────────────────────────────────────────────────────────

const mockUnsubscribe = jest.fn().mockResolvedValue(true);
const mockToJSON = jest.fn().mockReturnValue({
  endpoint: 'https://push.example.com/token',
  keys: { p256dh: 'p256dh-base64', auth: 'auth-base64' },
});
const mockPushSubscription = { toJSON: mockToJSON, unsubscribe: mockUnsubscribe };
const mockPushManagerSubscribe = jest.fn().mockResolvedValue(mockPushSubscription);
const mockPushManagerGetSubscription = jest.fn().mockResolvedValue(mockPushSubscription);
const mockRegistration = {
  pushManager: {
    subscribe: mockPushManagerSubscribe,
    getSubscription: mockPushManagerGetSubscription,
  },
};
const mockRequestPermission = jest.fn().mockResolvedValue('granted');

// Define Notification on global before any test renders the hook
Object.defineProperty(global, 'Notification', {
  writable: true,
  value: { permission: 'default', requestPermission: mockRequestPermission },
});

// Define navigator.serviceWorker
Object.defineProperty(global.navigator, 'serviceWorker', {
  writable: true,
  value: {
    register: jest.fn().mockResolvedValue(mockRegistration),
    ready: Promise.resolve(mockRegistration),
  },
});

import { usePushSubscription } from '../usePushSubscription';

// ── Harness ───────────────────────────────────────────────────────────────────

function Harness() {
  const { subscribed, loading, permissionDenied, subscribe, unsubscribe } =
    usePushSubscription();
  return (
    <>
      <Text>{`subscribed-${subscribed}`}</Text>
      <Text>{`loading-${loading}`}</Text>
      <Text>{`denied-${permissionDenied}`}</Text>
      <Text onPress={subscribe}>subscribe</Text>
      <Text onPress={unsubscribe}>unsubscribe</Text>
    </>
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('usePushSubscription', () => {
  beforeEach(() => {
    mockUserId = 'user-1';
    mockSubData = null;
    mockSubError = null;
    mockUpsert.mockResolvedValue({ error: null });
    mockDeleteEq.mockResolvedValue({ error: null });
    mockRequestPermission.mockResolvedValue('granted');
    mockPushManagerSubscribe.mockResolvedValue(mockPushSubscription);
    mockPushManagerGetSubscription.mockResolvedValue(mockPushSubscription);
    mockUnsubscribe.mockResolvedValue(true);
    (global.Notification as any).permission = 'default';
  });

  it('starts with subscribed false when DB has no subscription row', async () => {
    mockSubData = null;
    const { getByText } = render(<Harness />);
    await waitFor(() => expect(getByText('subscribed-false')).toBeTruthy());
    expect(getByText('denied-false')).toBeTruthy();
  });

  it('starts with subscribed true when DB has a subscription row', async () => {
    mockSubData = { endpoint: 'https://push.example.com/token' };
    const { getByText } = render(<Harness />);
    await waitFor(() => expect(getByText('subscribed-true')).toBeTruthy());
  });

  it('sets permissionDenied true when Notification.permission is denied on mount', async () => {
    (global.Notification as any).permission = 'denied';
    const { getByText } = render(<Harness />);
    await waitFor(() => expect(getByText('denied-true')).toBeTruthy());
    expect(getByText('subscribed-false')).toBeTruthy();
  });

  it('subscribe: sets permissionDenied true when permission request is denied', async () => {
    mockRequestPermission.mockResolvedValue('denied');
    const { getByText } = render(<Harness />);
    await waitFor(() => expect(getByText('subscribed-false')).toBeTruthy());
    await act(async () => {
      getByText('subscribe').props.onPress();
    });
    await waitFor(() => expect(getByText('denied-true')).toBeTruthy());
    expect(getByText('subscribed-false')).toBeTruthy();
  });

  it('subscribe: sets subscribed true and upserts DB when permission granted', async () => {
    const { getByText } = render(<Harness />);
    await waitFor(() => expect(getByText('subscribed-false')).toBeTruthy());
    await act(async () => {
      getByText('subscribe').props.onPress();
    });
    await waitFor(() => expect(getByText('subscribed-true')).toBeTruthy());
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-1',
        endpoint: 'https://push.example.com/token',
        p256dh: 'p256dh-base64',
        auth: 'auth-base64',
      }),
    );
  });

  it('unsubscribe: sets subscribed false and deletes DB row', async () => {
    mockSubData = { endpoint: 'https://push.example.com/token' };
    const { getByText } = render(<Harness />);
    await waitFor(() => expect(getByText('subscribed-true')).toBeTruthy());
    await act(async () => {
      getByText('unsubscribe').props.onPress();
    });
    await waitFor(() => expect(getByText('subscribed-false')).toBeTruthy());
    expect(mockUnsubscribe).toHaveBeenCalled();
    expect(mockDeleteEq).toHaveBeenCalledWith('user_id', 'user-1');
  });
});
