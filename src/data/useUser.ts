import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import { getOrCreateFingerprint } from './deviceFingerprint';
import type { User } from './types';

export interface UseUserResult {
  user: User | null;
  loading: boolean;
  error: Error | null;
}

export function useUser(): UseUserResult {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const fp = await getOrCreateFingerprint();

        // Resolve the authenticated user, signing in anonymously if needed.
        // We capture the user directly from the auth responses to avoid a
        // second getUser() call — the session storage is mocked in tests and
        // a follow-up getUser() would fail with "Auth session missing!".
        let authUserId: string | undefined;
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData.session?.user) {
          authUserId = sessionData.session.user.id;
        } else {
          const { data: anonData, error: anonErr } = await supabase.auth.signInAnonymously();
          if (anonErr) throw anonErr;
          authUserId = anonData.user?.id;
        }
        if (!authUserId) throw new Error('Failed to obtain authenticated user id');

        // Look up user by device fingerprint, create if missing.
        const { data: existing, error: selErr } = await supabase
          .from('users')
          .select('*')
          .eq('device_fingerprint', fp)
          .maybeSingle();
        if (selErr) throw selErr;

        if (existing) {
          if (!cancelled) {
            setUser(existing as User);
            setLoading(false);
          }
          return;
        }

        const insert = await supabase
          .from('users')
          .insert({
            id: authUserId, // bind public.users.id to auth.users.id so RLS lines up
            device_fingerprint: fp,
          })
          .select('*')
          .single();
        if (insert.error) throw insert.error;

        if (!cancelled) {
          setUser(insert.data as User);
          setLoading(false);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e as Error);
          setLoading(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return { user, loading, error };
}
