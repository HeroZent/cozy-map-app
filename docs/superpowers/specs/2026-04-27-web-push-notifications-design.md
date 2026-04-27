# Web Push Notifications (VAPID) Design

## Goal

Notify Sulat authors via browser push even when the app is closed — targeting mobile web browsers (iOS Safari 16.4+, Chrome on Android). Authors opt in via a toggle in Settings. One subscription per user; a new subscription overwrites the previous one.

## Architecture

**Three layers:**
1. **DB** — `push_subscriptions` table (one row per user, client writes via RLS)
2. **Client** — `sw.js` service worker + `usePushSubscription` hook + Settings toggle
3. **Delivery** — `_shared/push.ts` helper called from `post-reply` and `react-story`

## Tech Stack

Supabase JS v2, React Native Web, Expo Router, Deno Edge Functions, `web-push@3.6.7` (esm.sh), Web Push API (VAPID)

---

## Section 1 — Database

### `push_subscriptions` table

```sql
create table public.push_subscriptions (
  user_id    uuid primary key references public.users(id) on delete cascade,
  endpoint   text not null,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz not null default now()
);
```

`user_id` is the primary key — one subscription per user. A new subscription from the same user (new device or browser) upserts the row, replacing endpoint and keys.

**RLS:**
- Users can `SELECT`, `INSERT`, and `DELETE` their own row (`auth.uid() = user_id`)
- No `UPDATE` policy — client always upserts via `INSERT ... ON CONFLICT DO UPDATE`
- No service-role writes to this table

**Migration file:** `supabase/migrations/20260427000006_push_subscriptions.sql`

### VAPID key generation

Run once locally to generate the key pair:

```bash
npx web-push generate-vapid-keys
```

Store the output as Supabase Edge Function secrets:
- `VAPID_PUBLIC_KEY` — the URL-safe base64 public key
- `VAPID_PRIVATE_KEY` — the URL-safe base64 private key
- `VAPID_SUBJECT` — `mailto:emmanuel.vincent.mandolado@gmail.com`

The public key is also hardcoded as a constant in the client (`src/push/usePushSubscription.ts`) — VAPID public keys are safe to embed in client code.

---

## Section 2 — Client Layer

### Service worker (`public/sw.js`)

A static file placed in `public/` — Expo copies it to `dist/` at build time, making it available at `https://sulat.vercel.app/sw.js`.

```javascript
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

### Service worker registration

In `app/index.tsx`, register the service worker on mount (web only):

```tsx
useEffect(() => {
  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.error('[sw] registration failed:', err);
    });
  }
}, []);
```

### `usePushSubscription` hook (`src/push/usePushSubscription.ts`)

```typescript
interface UsePushSubscriptionResult {
  subscribed: boolean;
  loading: boolean;
  permissionDenied: boolean;
  subscribe: () => Promise<void>;
  unsubscribe: () => Promise<void>;
}
```

**State:**
- `subscribed` — true when user has an active subscription row in DB
- `loading` — true during subscribe/unsubscribe operations
- `permissionDenied` — true when `Notification.permission === 'denied'`

**On mount:** checks `Notification.permission` and queries `push_subscriptions` for the current user to set initial `subscribed` state. If not running in a browser with `serviceWorker` support, does nothing (fails silently — no banner, no error).

**`subscribe()`:**
1. Call `Notification.requestPermission()` — if result is not `'granted'`, set `permissionDenied: true` and return
2. Get the service worker registration: `await navigator.serviceWorker.ready`
3. Call `registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) })`
4. Call `subscription.toJSON()` — returns `{ endpoint, keys: { p256dh, auth } }` where both keys are already base64url strings. No manual `ArrayBuffer` conversion needed.
5. Upsert into `push_subscriptions` via Supabase: `.from('push_subscriptions').upsert({ user_id, endpoint, p256dh: keys.p256dh, auth: keys.auth })`
6. Set `subscribed: true`

**`unsubscribe()`:**
1. Get the active subscription via `registration.pushManager.getSubscription()`
2. Call `subscription.unsubscribe()`
3. Delete row: `.from('push_subscriptions').delete().eq('user_id', userId)`
4. Set `subscribed: false`

**`urlBase64ToUint8Array` utility** — standard VAPID key conversion helper (converts the base64url public key string to `Uint8Array` for `applicationServerKey`), defined in the same file:

```typescript
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}
```

Errors on subscribe/unsubscribe are `console.error`'d and set `loading: false` without crashing.

### Settings toggle

In `src/settings/SettingsSheet.tsx`, add a push notifications row below the existing heatmap toggle:

```tsx
// Push notifications toggle row
<View style={styles.settingRow}>
  <Text style={[styles.settingLabel, { color: theme.textPrimary }]}>
    Push notifications
  </Text>
  {permissionDenied ? (
    <Text style={[styles.settingHint, { color: theme.textMuted }]}>
      Enable in browser settings
    </Text>
  ) : (
    <Switch
      value={subscribed}
      onValueChange={(val) => val ? subscribe() : unsubscribe()}
      disabled={loading}
      trackColor={{ true: theme.accent, false: theme.textMuted }}
      thumbColor={theme.surface}
    />
  )}
</View>
```

`usePushSubscription()` is called inside `SettingsSheet`. The hook is a no-op on non-web platforms (returns `subscribed: false`, `loading: false`, no-op functions).

---

## Section 3 — Delivery Layer

### `_shared/push.ts`

```typescript
import webpush from 'https://esm.sh/web-push@3.6.7';

interface PushSubscriptionRow {
  endpoint: string;
  p256dh: string;
  auth: string;
}

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
  if (!sub) return; // user has not subscribed — silent no-op

  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify({ title, body }),
    );
  } catch (err: unknown) {
    // 410 Gone = subscription expired/revoked — delete the stale row
    if (err instanceof Error && 'statusCode' in err && (err as { statusCode: number }).statusCode === 410) {
      await serviceSupa.from('push_subscriptions').delete().eq('user_id', userId);
      console.error('[push] stale subscription removed for user:', userId);
    } else {
      console.error('[push] send error:', err);
    }
  }
}
```

### Edge function changes

**`post-reply/index.ts`** — add import at top, then place the push call inside the existing `else if (notifStoryRow && notifStoryRow.author_id !== authUser.user.id)` block, after the notification insert:

```typescript
import { sendPushNotification } from '../_shared/push.ts';

// Inside the else-if block, after the notification insert:
} else if (notifStoryRow && notifStoryRow.author_id !== authUser.user.id) {
  const { error: notifErr } = await serviceSupa.from('notifications').insert({ ... });
  if (notifErr) { console.error('[post-reply] notification insert error:', notifErr.message); }

  await sendPushNotification(
    serviceSupa,
    notifStoryRow.author_id,
    'New reply on your sulat',
    'Someone replied to your sulat',
  );
}
```

**`react-story/index.ts`** — same pattern inside the existing `else if (notifStoryRow && notifStoryRow.author_id !== userId)` block:

```typescript
import { sendPushNotification } from '../_shared/push.ts';

// Inside the else-if block, after the notification insert:
} else if (notifStoryRow && notifStoryRow.author_id !== userId) {
  const { error: notifErr } = await serviceSupa.from('notifications').insert({ ... });
  if (notifErr) { console.error('[react-story] notification insert error:', notifErr.message); }

  await sendPushNotification(
    serviceSupa,
    notifStoryRow.author_id,
    'New reaction on your sulat',
    `Someone reacted with ${payload.emoji}`,
  );
}
```

The push call lives inside the non-self guard — no duplicate self-notification check needed.

---

## Error Handling

| Scenario | Behaviour |
|----------|-----------|
| VAPID keys not set | Logs error, returns — no push sent |
| User has no subscription | Silent no-op (`maybeSingle()` returns null) |
| Push API call fails (network) | Logs error, non-blocking |
| 410 Gone (revoked subscription) | Deletes stale row, logs, non-blocking |
| `Notification.permission === 'denied'` | `permissionDenied: true`, toggle shows hint |
| Service worker registration fails | Logs error, app functions normally |
| `pushManager.subscribe()` throws | Logs error, `subscribed` stays false |

---

## What This Spec Does NOT Cover

- Native push (FCM / APNs) — future, when native app ships
- Push notification click deep-linking to specific sulat — future
- Per-type notification preferences (e.g., disable reaction pushes only) — future
- Web app manifest / "Add to Home Screen" PWA install — future
