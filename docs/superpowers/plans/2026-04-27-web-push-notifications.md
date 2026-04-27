# Web Push Notifications (VAPID) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Notify Sulat story authors via browser push even when the app is closed, using VAPID web push triggered from Supabase Edge Functions.

**Architecture:** Three layers — a `push_subscriptions` DB table (one row per user, RLS-guarded, upsert on re-subscribe), a client-side service worker + `usePushSubscription` hook + settings toggle that manages the subscription lifecycle, and a `_shared/push.ts` Deno helper called from `post-reply` and `react-story` edge functions to deliver pushes after notification rows are inserted.

**Tech Stack:** Supabase JS v2, React Native Web, Expo Router, Deno Edge Functions, `web-push@3.6.7` (esm.sh), Web Push API (VAPID)

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `supabase/migrations/20260427000006_push_subscriptions.sql` | Create | DB table + RLS |
| `public/sw.js` | Create | Service worker — handles push events and notification clicks |
| `src/push/usePushSubscription.ts` | Create | Hook — subscribe/unsubscribe lifecycle |
| `src/push/__tests__/usePushSubscription.test.tsx` | Create | Hook tests |
| `src/settings/SettingsSheet.tsx` | Modify | Add push notifications toggle row |
| `src/settings/__tests__/SettingsSheet.test.tsx` | Create | Settings toggle tests |
| `app/index.tsx` | Modify | Register service worker on mount (web only) |
| `supabase/functions/_shared/push.ts` | Create | Deno helper — sends VAPID push, handles 410 cleanup |
| `supabase/functions/post-reply/index.ts` | Modify | Call sendPushNotification after reply notification insert |
| `supabase/functions/react-story/index.ts` | Modify | Call sendPushNotification after reaction notification insert |

---

### Task 1: DB Migration — push_subscriptions table

**Files:**
- Create: `supabase/migrations/20260427000006_push_subscriptions.sql`

- [ ] **Step 1: Write the migration file**

```sql
-- supabase/migrations/20260427000006_push_subscriptions.sql

create table public.push_subscriptions (
  user_id    uuid primary key references public.users(id) on delete cascade,
  endpoint   text not null,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

-- Users can read their own subscription (hook checks DB on mount)
create policy "users select own push subscription"
  on public.push_subscriptions for select
  using (auth.uid() = user_id);

-- Client always upserts (INSERT ... ON CONFLICT DO UPDATE) — no UPDATE policy needed
create policy "users insert own push subscription"
  on public.push_subscriptions for insert
  with check (auth.uid() = user_id);

create policy "users delete own push subscription"
  on public.push_subscriptions for delete
  using (auth.uid() = user_id);
```

- [ ] **Step 2: Apply the migration**

Run: `npx supabase db push`

Expected: migration runs without error, table `push_subscriptions` exists in the remote database.

- [ ] **Step 3: Generate VAPID keys**

Run: `npx web-push generate-vapid-keys`

Expected output (your actual keys will differ):
```
=======================================

Public Key:
BEa...your_actual_public_key...

Private Key:
your_actual_private_key...

=======================================
```

Store in Supabase → Settings → Edge Functions → Secrets:
- `VAPID_PUBLIC_KEY` — the URL-safe base64 public key
- `VAPID_PRIVATE_KEY` — the URL-safe base64 private key
- `VAPID_SUBJECT` — `mailto:emmanuel.vincent.mandolado@gmail.com`

Copy the public key — you'll paste it into Task 3, Step 3.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260427000006_push_subscriptions.sql
git commit -m "feat: add push_subscriptions table with RLS"
```

---

### Task 2: Service Worker

**Files:**
- Create: `public/sw.js`

`public/` is copied to `dist/` by Expo at build time, making this available at `/sw.js`. No unit test — service worker runs in browser context only.

- [ ] **Step 1: Write the service worker**

```javascript
// public/sw.js

self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {};
  const title = data.title ?? 'Sulat';
  const body = data.body ?? '';
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/favicon.png',
      badge: '/favicon.png',
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow('/');
    })
  );
});
```

- [ ] **Step 2: Commit**

```bash
git add public/sw.js
git commit -m "feat: add service worker for web push notifications"
```

---

### Task 3: usePushSubscription hook

**Files:**
- Create: `src/push/usePushSubscription.ts`
- Create: `src/push/__tests__/usePushSubscription.test.tsx`

The hook is a no-op on non-browser platforms — all browser API checks happen inside function bodies (not at module load time) so tests can mock them.

- [ ] **Step 1: Write the failing tests**

```tsx
// src/push/__tests__/usePushSubscription.test.tsx
import React from 'react';
import { render, waitFor, act } from '@testing-library/react-native';
import { Text, Pressable } from 'react-native';

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
      <Pressable onPress={subscribe}><Text>subscribe</Text></Pressable>
      <Pressable onPress={unsubscribe}><Text>unsubscribe</Text></Pressable>
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest src/push/__tests__/usePushSubscription.test.tsx --no-coverage`

Expected: FAIL — `Cannot find module '../usePushSubscription'`

- [ ] **Step 3: Write the hook implementation**

Replace `'PASTE_YOUR_VAPID_PUBLIC_KEY_HERE'` with the actual public key generated in Task 1, Step 3.

```typescript
// src/push/usePushSubscription.ts
import { useState, useEffect } from 'react';
import { supabase } from '@/data/supabase';

// VAPID public key — safe to embed in client code.
// Generate via: npx web-push generate-vapid-keys
// Store the private key in Supabase Edge Function secrets as VAPID_PRIVATE_KEY.
const VAPID_PUBLIC_KEY = 'PASTE_YOUR_VAPID_PUBLIC_KEY_HERE';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

// Checked at call-time (inside hook/functions), not at module load,
// so Jest can mock navigator.serviceWorker and Notification before rendering.
function isSupported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    'serviceWorker' in navigator &&
    typeof Notification !== 'undefined'
  );
}

export interface UsePushSubscriptionResult {
  subscribed: boolean;
  loading: boolean;
  permissionDenied: boolean;
  subscribe: () => Promise<void>;
  unsubscribe: () => Promise<void>;
}

export function usePushSubscription(): UsePushSubscriptionResult {
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);

  useEffect(() => {
    if (!isSupported()) return;

    if (Notification.permission === 'denied') {
      setPermissionDenied(true);
      return;
    }

    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      const { data } = await supabase
        .from('push_subscriptions')
        .select('endpoint')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (data) setSubscribed(true);
    })();
  }, []);

  const subscribe = async (): Promise<void> => {
    if (!isSupported()) return;

    setLoading(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setPermissionDenied(true);
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      const json = subscription.toJSON() as {
        endpoint: string;
        keys: { p256dh: string; auth: string };
      };

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      await supabase.from('push_subscriptions').upsert({
        user_id: session.user.id,
        endpoint: json.endpoint,
        p256dh: json.keys.p256dh,
        auth: json.keys.auth,
      });

      setSubscribed(true);
    } catch (err) {
      console.error('[push] subscribe error:', err);
    } finally {
      setLoading(false);
    }
  };

  const unsubscribe = async (): Promise<void> => {
    if (!isSupported()) return;

    setLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) await subscription.unsubscribe();

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      await supabase
        .from('push_subscriptions')
        .delete()
        .eq('user_id', session.user.id);

      setSubscribed(false);
    } catch (err) {
      console.error('[push] unsubscribe error:', err);
    } finally {
      setLoading(false);
    }
  };

  return { subscribed, loading, permissionDenied, subscribe, unsubscribe };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest src/push/__tests__/usePushSubscription.test.tsx --no-coverage`

Expected: PASS — 6 tests passing.

- [ ] **Step 5: Run full suite to confirm no regressions**

Run: `npx jest --no-coverage`

Expected: all suites pass.

- [ ] **Step 6: Commit**

```bash
git add src/push/usePushSubscription.ts src/push/__tests__/usePushSubscription.test.tsx
git commit -m "feat: add usePushSubscription hook"
```

---

### Task 4: Settings toggle

**Files:**
- Modify: `src/settings/SettingsSheet.tsx`
- Create: `src/settings/__tests__/SettingsSheet.test.tsx`

Adds a push notifications toggle row below the heatmap toggle. Uses React Native `Switch` (not the custom `ToggleRow` component — the switch style signals this can be denied by the OS).

- [ ] **Step 1: Write the failing tests**

```tsx
// src/settings/__tests__/SettingsSheet.test.tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { View } from 'react-native';
import { SettingsSheet } from '../SettingsSheet';

jest.mock('@/components/AnimatedSheet', () => ({
  AnimatedSheet: ({ children, style }: any) => <View style={style}>{children}</View>,
}));

jest.mock('@/theme/ThemeContext', () => ({
  useTheme: () => ({
    surface: '#1a1a2e',
    accent: '#f4c97a',
    textMuted: '#888',
    textPrimary: '#fff',
    fontFamily: 'serif',
    id: 'lantern',
    name: 'Lantern Glow',
    description: '',
    mapStyle: '',
    background: '#0a0e22',
    pin: { glow: '#f4c97a', body: '#f4c97a', pulseDuration: 2000 },
    pinMemory: { body: '#d4a96a', glow: '#d4a96a', decoration: '✦' },
    heatmap: [],
    reactionTint: '#f4c97a',
  }),
}));

const mockSubscribe = jest.fn().mockResolvedValue(undefined);
const mockUnsubscribe = jest.fn().mockResolvedValue(undefined);
let mockPushState = {
  subscribed: false,
  loading: false,
  permissionDenied: false,
  subscribe: mockSubscribe,
  unsubscribe: mockUnsubscribe,
};

jest.mock('@/push/usePushSubscription', () => ({
  usePushSubscription: () => mockPushState,
}));

const baseProps = {
  onClose: jest.fn(),
  heatmapOn: true,
  onHeatmapToggle: jest.fn(),
};

describe('SettingsSheet push toggle', () => {
  beforeEach(() => {
    mockPushState = {
      subscribed: false,
      loading: false,
      permissionDenied: false,
      subscribe: mockSubscribe,
      unsubscribe: mockUnsubscribe,
    };
    mockSubscribe.mockClear();
    mockUnsubscribe.mockClear();
  });

  it('renders Push notifications label', () => {
    const { getByText } = render(<SettingsSheet {...baseProps} />);
    expect(getByText('Push notifications')).toBeTruthy();
  });

  it('shows switch when permissionDenied is false', () => {
    const { getByTestId } = render(<SettingsSheet {...baseProps} />);
    expect(getByTestId('push-notifications-switch')).toBeTruthy();
  });

  it('shows hint text and no switch when permissionDenied is true', () => {
    mockPushState = { ...mockPushState, permissionDenied: true };
    const { getByText, queryByTestId } = render(<SettingsSheet {...baseProps} />);
    expect(getByText('Enable in browser settings')).toBeTruthy();
    expect(queryByTestId('push-notifications-switch')).toBeNull();
  });

  it('calls subscribe when switch is toggled on', () => {
    const { getByTestId } = render(<SettingsSheet {...baseProps} />);
    fireEvent(getByTestId('push-notifications-switch'), 'valueChange', true);
    expect(mockSubscribe).toHaveBeenCalledTimes(1);
  });

  it('calls unsubscribe when switch is toggled off', () => {
    mockPushState = { ...mockPushState, subscribed: true };
    const { getByTestId } = render(<SettingsSheet {...baseProps} />);
    fireEvent(getByTestId('push-notifications-switch'), 'valueChange', false);
    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });

  it('switch is disabled when loading is true', () => {
    mockPushState = { ...mockPushState, loading: true };
    const { getByTestId } = render(<SettingsSheet {...baseProps} />);
    expect(getByTestId('push-notifications-switch').props.disabled).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest src/settings/__tests__/SettingsSheet.test.tsx --no-coverage`

Expected: FAIL — `Cannot find module '@/push/usePushSubscription'`

- [ ] **Step 3: Rewrite SettingsSheet.tsx**

Replace the full file with:

```tsx
// src/settings/SettingsSheet.tsx
import { useRef } from 'react';
import { View, Text, Pressable, Switch, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { AnimatedSheet, type AnimatedSheetRef } from '@/components/AnimatedSheet';
import { usePushSubscription } from '@/push/usePushSubscription';

export interface SettingsSheetProps {
  onClose: () => void;
  heatmapOn: boolean;
  onHeatmapToggle: () => void;
  bottomOffset?: number;
}

export function SettingsSheet({ onClose, heatmapOn, onHeatmapToggle, bottomOffset = 0 }: SettingsSheetProps) {
  const theme = useTheme();
  const sheetRef = useRef<AnimatedSheetRef>(null);
  const { subscribed, loading, permissionDenied, subscribe, unsubscribe } = usePushSubscription();

  return (
    <AnimatedSheet ref={sheetRef} style={[styles.card, { backgroundColor: theme.surface, bottom: bottomOffset }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.textPrimary, fontFamily: theme.fontFamily }]}>
          Settings
        </Text>
        <Pressable onPress={() => sheetRef.current?.close(onClose)} style={styles.closeHitbox}>
          <Text style={[styles.closeTxt, { color: theme.textMuted }]}>✕</Text>
        </Pressable>
      </View>

      <Row label="App" value="sulat. v0.1.0" theme={theme} />
      <Row label="Theme" value="Lantern Glow" theme={theme} />
      <Row label="Mode" value="Anonymous — no account needed" theme={theme} />
      <ToggleRow label="Heatmap" enabled={heatmapOn} onToggle={onHeatmapToggle} theme={theme} />

      {/* Push notifications toggle */}
      <View style={styles.row}>
        <Text style={[styles.rowLabel, { color: theme.textMuted }]}>Push notifications</Text>
        {permissionDenied ? (
          <Text style={[styles.rowValue, { color: theme.textMuted }]}>Enable in browser settings</Text>
        ) : (
          <Switch
            testID="push-notifications-switch"
            value={subscribed}
            onValueChange={(val) => (val ? subscribe() : unsubscribe())}
            disabled={loading}
            trackColor={{ true: theme.accent, false: theme.textMuted }}
            thumbColor={theme.surface}
          />
        )}
      </View>

      <View style={[styles.divider, { backgroundColor: 'rgba(245,230,200,0.08)' }]} />

      <Text style={[styles.about, { color: theme.textMuted }]}>
        sulat is a cozy anonymous map for leaving little notes at the places that matter to you. No usernames, no followers — just words and a pin.
      </Text>

      <Text style={[styles.credit, { color: 'rgba(245,230,200,0.3)' }]}>
        Made with warmth 🕯️
      </Text>
    </AnimatedSheet>
  );
}

function Row({ label, value, theme }: { label: string; value: string; theme: ReturnType<typeof useTheme> }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, { color: theme.textMuted }]}>{label}</Text>
      <Text style={[styles.rowValue, { color: theme.textPrimary }]}>{value}</Text>
    </View>
  );
}

function ToggleRow({ label, enabled, onToggle, theme }: { label: string; enabled: boolean; onToggle: () => void; theme: ReturnType<typeof useTheme> }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, { color: theme.textMuted }]}>{label}</Text>
      <Pressable onPress={onToggle} style={[styles.toggle, { borderColor: theme.accent, backgroundColor: enabled ? theme.accent : 'transparent' }]}>
        <Text style={[styles.toggleTxt, { color: enabled ? '#2a1f0a' : theme.textMuted }]}>
          {enabled ? 'on' : 'off'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  about: { fontSize: 13, lineHeight: 20, marginBottom: 16 },
  card: {
    borderRadius: 18,
    elevation: 12,
    left: 12,
    paddingBottom: 20,
    paddingHorizontal: 16,
    paddingTop: 14,
    position: 'absolute',
    right: 12,
    shadowColor: '#1a0e00',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
  },
  closeHitbox: { marginLeft: 'auto', padding: 4 },
  closeTxt: { fontSize: 14 },
  credit: { fontSize: 11, textAlign: 'center' },
  divider: { height: 1, marginBottom: 14, marginTop: 4 },
  header: { alignItems: 'center', flexDirection: 'row', marginBottom: 16 },
  headerTitle: { fontSize: 17, fontWeight: '500' },
  row: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  rowLabel: { fontSize: 13 },
  rowValue: { fontSize: 13, fontWeight: '500' },
  toggle: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 3 },
  toggleTxt: { fontSize: 12, fontWeight: '600' },
});
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest src/settings/__tests__/SettingsSheet.test.tsx --no-coverage`

Expected: PASS — 6 tests passing.

- [ ] **Step 5: Run full suite to confirm no regressions**

Run: `npx jest --no-coverage`

Expected: all suites pass.

- [ ] **Step 6: Commit**

```bash
git add src/settings/SettingsSheet.tsx src/settings/__tests__/SettingsSheet.test.tsx
git commit -m "feat: add push notifications toggle to SettingsSheet"
```

---

### Task 5: Service worker registration in app/index.tsx

**Files:**
- Modify: `app/index.tsx` (after line 65, after the `useNotifications` destructure)

No new test — SW registration is a browser side-effect, not testable in Jest.

- [ ] **Step 1: Add the SW registration useEffect**

In `app/index.tsx`, inside the `Home` component, add this block directly after the `useNotifications` destructure line:

```tsx
  // Register service worker for web push (web only — no-op on native)
  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.error('[sw] registration failed:', err);
      });
    }
  }, []);
```

The `useEffect` import is already present at line 1 — no new import needed.

- [ ] **Step 2: Run full suite to confirm no regressions**

Run: `npx jest --no-coverage`

Expected: all suites pass.

- [ ] **Step 3: Commit**

```bash
git add app/index.tsx
git commit -m "feat: register service worker on app load"
```

---

### Task 6: _shared/push.ts delivery helper

**Files:**
- Create: `supabase/functions/_shared/push.ts`

Deno Edge Function helper. No Jest test — Deno TypeScript is not executed in the Jest environment. Matches the pattern of `_shared/moderate.ts`.

- [ ] **Step 1: Write the delivery helper**

```typescript
// supabase/functions/_shared/push.ts
import webpush from 'https://esm.sh/web-push@3.6.7';
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface PushSubscriptionRow {
  endpoint: string;
  p256dh: string;
  auth: string;
}

/**
 * Send a VAPID web push notification to a user.
 * Fails open — any error is logged and the caller continues unblocked.
 * Automatically removes stale subscriptions on 410 Gone.
 */
export async function sendPushNotification(
  serviceSupa: SupabaseClient,
  userId: string,
  title: string,
  body: string,
): Promise<void> {
  const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY') ?? '';
  const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY') ?? '';
  const vapidSubject = Deno.env.get('VAPID_SUBJECT') ?? '';

  if (!vapidPublicKey || !vapidPrivateKey) {
    console.error('[push] VAPID keys not configured');
    return;
  }

  const { data: sub, error: subErr } = await serviceSupa
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('user_id', userId)
    .maybeSingle();

  if (subErr) {
    console.error('[push] subscription lookup error:', subErr.message);
    return;
  }
  if (!sub) return; // user has no subscription — silent no-op

  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify({ title, body }),
    );
  } catch (err: unknown) {
    // 410 Gone = subscription expired or revoked — remove the stale row
    if (
      err instanceof Error &&
      'statusCode' in err &&
      (err as { statusCode: number }).statusCode === 410
    ) {
      await serviceSupa
        .from('push_subscriptions')
        .delete()
        .eq('user_id', userId);
      console.error('[push] stale subscription removed for user:', userId);
    } else {
      console.error('[push] send error:', err);
    }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add supabase/functions/_shared/push.ts
git commit -m "feat: add sendPushNotification delivery helper"
```

---

### Task 7: post-reply push integration

**Files:**
- Modify: `supabase/functions/post-reply/index.ts`

Add `sendPushNotification` call inside the existing `else if (notifStoryRow && ...)` block, after the notification insert.

- [ ] **Step 1: Add the import**

In `supabase/functions/post-reply/index.ts`, add line 5 (after the existing three imports):

```typescript
import { sendPushNotification } from '../_shared/push.ts';
```

Top of file should now read:

```typescript
// supabase/functions/post-reply/index.ts
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { moderateContent } from '../_shared/moderate.ts';
import { sendPushNotification } from '../_shared/push.ts';
```

- [ ] **Step 2: Add the push call**

Find the `else if` block starting at line 117. Replace that block with:

```typescript
  } else if (notifStoryRow && notifStoryRow.author_id !== authUser.user.id) {
    const { error: notifErr } = await serviceSupa.from('notifications').insert({
      user_id: notifStoryRow.author_id,
      type: 'new_reply',
      story_id: payload.story_id,
      payload: {},
    });
    if (notifErr) {
      console.error('[post-reply] notification insert error:', notifErr.message);
    }

    await sendPushNotification(
      serviceSupa,
      notifStoryRow.author_id,
      'New reply on your sulat',
      'Someone replied to your sulat',
    );
  }
```

- [ ] **Step 3: Run full suite to confirm no regressions**

Run: `npx jest --no-coverage`

Expected: all suites pass.

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/post-reply/index.ts
git commit -m "feat: send push notification on new reply"
```

---

### Task 8: react-story push integration

**Files:**
- Modify: `supabase/functions/react-story/index.ts`

Same pattern as Task 7.

- [ ] **Step 1: Add the import**

In `supabase/functions/react-story/index.ts`, add line 3 (after the existing two imports):

```typescript
import { sendPushNotification } from '../_shared/push.ts';
```

Top of file should now read:

```typescript
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendPushNotification } from '../_shared/push.ts';
```

- [ ] **Step 2: Add the push call**

Find the `else if` block starting at line 89. Replace that block with:

```typescript
  } else if (notifStoryRow && notifStoryRow.author_id !== userId) {
    const { error: notifErr } = await serviceSupa.from('notifications').insert({
      user_id: notifStoryRow.author_id,
      type: 'new_reaction',
      story_id: payload.story_id,
      payload: { emoji: payload.emoji },
    });
    if (notifErr) {
      console.error('[react-story] notification insert error:', notifErr.message);
    }

    await sendPushNotification(
      serviceSupa,
      notifStoryRow.author_id,
      'New reaction on your sulat',
      `Someone reacted with ${payload.emoji}`,
    );
  }
```

- [ ] **Step 3: Run full suite to confirm no regressions**

Run: `npx jest --no-coverage`

Expected: all suites pass.

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/react-story/index.ts
git commit -m "feat: send push notification on new reaction"
```

---

## Post-Implementation: Deploy Edge Functions

After merging, deploy both updated edge functions so VAPID push delivery goes live:

```bash
npx supabase functions deploy post-reply
npx supabase functions deploy react-story
```
