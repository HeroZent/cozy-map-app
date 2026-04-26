import { kvGet, kvSet } from '@/lib/persistence';

const KEY = 'sulat.deviceFingerprint';

function uuid(): string {
  // RFC4122 v4 UUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export async function getOrCreateFingerprint(): Promise<string> {
  const existing = await kvGet(KEY);
  if (existing) return existing;
  const fp = uuid();
  await kvSet(KEY, fp);
  return fp;
}
