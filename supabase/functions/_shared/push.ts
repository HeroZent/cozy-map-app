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
