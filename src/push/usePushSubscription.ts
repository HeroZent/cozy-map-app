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
