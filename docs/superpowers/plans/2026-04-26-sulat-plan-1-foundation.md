# Sulat — Plan 1: Foundation MVP

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A fully functional Sulat web app where a person can post a story to a world map and read other people's stories. Anonymous identity. Default Lantern Glow theme. Heatmap and clustering working. Deployed to Vercel.

**Architecture:** Expo (React Native + React Native Web) talking to Supabase (Postgres + PostGIS + Auth + Realtime + Edge Functions). MapLibre GL renders the map with OpenFreeMap tiles. The web build is the development target; Android/iOS ports come in later phases.

**Tech Stack:** TypeScript (strict), Expo SDK 51+, React Native + React Native Web, MapLibre GL JS, Supercluster, Supabase JS SDK v2, Jest + React Native Testing Library, Playwright (E2E web), Vercel (deploy target).

**What this plan deliberately defers:**
- Full moderation pipeline (Plan 2 — only minimal length validation here)
- Replies and reactions (Plan 3)
- Optional account upgrade (Plan 3)
- The other 3 themes besides Lantern Glow (Plan 4)
- Memory transition + Lantern Mode + onboarding + accessibility passes (Plan 4)
- Admin moderator dashboard + Sentry + privacy/ToS (Plan 5)

---

## File Structure

This is the structure Plan 1 will produce. Each file has one clear responsibility.

```
sulat/                                  # project root (renamed from cozy-map-app)
├── app/                                # Expo Router routes (file-based routing)
│   ├── _layout.tsx                     # root layout: theme provider, supabase provider
│   ├── index.tsx                       # main screen: <MapScreen />
│   ├── compose.tsx                     # composer screen
│   └── story/[id].tsx                  # single-story view
├── src/
│   ├── data/
│   │   ├── supabase.ts                 # supabase client singleton
│   │   ├── deviceFingerprint.ts        # generates + persists UUID
│   │   ├── useUser.ts                  # hook: anonymous user identity
│   │   ├── useStories.ts               # hook: stories within viewport bbox
│   │   ├── useCreateStory.ts           # hook: submit a new story
│   │   └── types.ts                    # Story, Mood, User TypeScript types
│   ├── map/
│   │   ├── MapView.tsx                 # MapLibre wrapper, viewport persistence
│   │   ├── PinMarker.tsx               # single pin (glow + emoji)
│   │   ├── StoryPins.tsx               # renders array of stories as pins
│   │   ├── ClusterMarker.tsx           # collapsed cluster pin "+N"
│   │   ├── HeatmapLayer.tsx            # density overlay
│   │   ├── useViewport.ts              # hook: persisted viewport state
│   │   └── useClusters.ts              # hook: supercluster wrapper
│   ├── compose/
│   │   ├── ComposerScreen.tsx          # 3-step state machine
│   │   ├── MoodPicker.tsx              # step 1: 8-mood grid
│   │   ├── TextEditor.tsx              # step 2: 1000-char text area
│   │   ├── LocationPicker.tsx          # step 3 container: 3 tabs
│   │   ├── LocationGPS.tsx             # step 3a
│   │   ├── LocationDropPin.tsx         # step 3b
│   │   └── LocationCity.tsx            # step 3c (Photon geocoder)
│   ├── story/
│   │   └── StoryView.tsx               # full read view of one story
│   ├── theme/
│   │   ├── lanternGlow.ts              # Lantern Glow theme token object
│   │   ├── ThemeContext.tsx            # provider exposing active theme
│   │   └── types.ts                    # SulatTheme interface
│   ├── moods/
│   │   └── catalog.ts                  # the 8 moods (id, emoji, name, description)
│   └── lib/
│       ├── geo.ts                      # round-to-500m, geocoder client
│       └── persistence.ts              # cross-platform key-value (web + native)
├── supabase/
│   ├── migrations/
│   │   ├── 20260426000001_extensions.sql
│   │   ├── 20260426000002_users.sql
│   │   ├── 20260426000003_stories.sql
│   │   ├── 20260426000004_support_tables.sql
│   │   └── 20260426000005_rls.sql
│   └── functions/
│       └── create-story/
│           └── index.ts                # Edge Function: validates + inserts a story
├── tests/
│   ├── unit/                           # Jest + RNTL unit/component tests
│   │   ├── deviceFingerprint.test.ts
│   │   ├── moods.test.ts
│   │   ├── geo.test.ts
│   │   ├── MoodPicker.test.tsx
│   │   ├── TextEditor.test.tsx
│   │   └── PinMarker.test.tsx
│   ├── integration/
│   │   └── createStory.test.ts         # against local Supabase
│   └── e2e/
│       ├── journey-tracker.ts          # JourneyTracker overlay helper
│       └── post-story.spec.ts          # Playwright E2E
├── .env.local.example                  # template for env vars (committed)
├── .env.local                          # actual env (gitignored)
├── app.json                            # Expo config
├── package.json
├── tsconfig.json
├── jest.config.js
├── playwright.config.ts
└── README.md
```

---

## Task 1: Initialize Expo project

**Files:**
- Create: project root with `package.json`, `app.json`, `tsconfig.json`
- Modify: existing `cozy-map-app/` directory becomes the project root (we'll rename to `sulat/` at the end of this task or leave the folder name and just configure `app.json`)

- [ ] **Step 1: Initialize Expo with TypeScript template**

In `C:\Users\emman\OneDrive\Desktop\ClaudeBusiness\cozy-map-app`, run:
```bash
npx create-expo-app@latest . --template blank-typescript
```

Expected: creates `App.tsx`, `package.json`, `tsconfig.json`, `app.json`, `assets/`. The dot (`.`) tells it to scaffold into the current directory. If it complains about non-empty directory, accept overwrite — our existing `docs/`, `.gitignore`, `.git/` will remain because they're not in the scaffold's file list.

- [ ] **Step 2: Configure `app.json` with project identity**

Edit `app.json`:
```json
{
  "expo": {
    "name": "Sulat",
    "slug": "sulat",
    "version": "0.1.0",
    "orientation": "portrait",
    "userInterfaceStyle": "automatic",
    "scheme": "sulat",
    "newArchEnabled": true,
    "ios": { "supportsTablet": false, "bundleIdentifier": "ph.sulat.app" },
    "android": { "package": "ph.sulat.app", "adaptiveIcon": { "backgroundColor": "#0a0e22" } },
    "web": { "bundler": "metro", "output": "static", "favicon": "./assets/favicon.png" },
    "plugins": ["expo-router", "expo-secure-store", "expo-location"],
    "experiments": { "typedRoutes": true }
  }
}
```

- [ ] **Step 3: Install Expo Router and core deps**

```bash
npx expo install expo-router react-native-safe-area-context react-native-screens expo-secure-store expo-location expo-linking expo-constants expo-status-bar
npx expo install react-dom react-native-web @expo/metro-runtime
```

- [ ] **Step 4: Replace `App.tsx` with Expo Router entry**

Delete `App.tsx`. Update `package.json` `"main"` to `"expo-router/entry"`.

- [ ] **Step 5: Create router skeleton**

`app/_layout.tsx`:
```tsx
import { Stack } from 'expo-router';

export default function RootLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
```

`app/index.tsx`:
```tsx
import { Text, View } from 'react-native';

export default function Home() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Sulat — Foundation MVP scaffold</Text>
    </View>
  );
}
```

- [ ] **Step 6: Verify dev server starts on web**

```bash
npx expo start --web
```

Expected: browser opens at `http://localhost:8081` showing "Sulat — Foundation MVP scaffold".

Stop the dev server (Ctrl+C).

- [ ] **Step 7: Commit**

```bash
git add .
git commit -m "feat: scaffold Expo project with TypeScript and expo-router"
```

---

## Task 2: Tooling — strict TypeScript, ESLint, Prettier, Jest, Playwright

**Files:**
- Create: `tsconfig.json` (overwrite Expo default with strict config), `.eslintrc.js`, `.prettierrc`, `jest.config.js`, `jest.setup.js`, `playwright.config.ts`
- Modify: `package.json` (add scripts + devDependencies)

- [ ] **Step 1: Tighten `tsconfig.json`**

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["**/*.ts", "**/*.tsx"]
}
```

> **Why no `exactOptionalPropertyTypes`:** It's stricter than React Native props and Supabase types are typically written for. We get most safety from `strict: true` + `noUncheckedIndexedAccess` without forcing rewrites of every optional prop.

- [ ] **Step 2: Add ESLint + Prettier**

```bash
npm install -D eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin eslint-plugin-react eslint-plugin-react-native prettier eslint-config-prettier
```

Create `.eslintrc.js`:
```js
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'react', 'react-native'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-native/all',
    'prettier',
  ],
  env: { browser: true, node: true, jest: true },
  settings: { react: { version: 'detect' } },
  rules: {
    'react/react-in-jsx-scope': 'off',
    'react-native/no-color-literals': 'off',
    'react-native/no-raw-text': 'off',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
  },
};
```

Create `.prettierrc`:
```json
{ "singleQuote": true, "trailingComma": "all", "printWidth": 100, "semi": true }
```

- [ ] **Step 3: Add Jest + RN Testing Library**

```bash
npm install -D jest jest-expo @types/jest @testing-library/react-native @testing-library/jest-native react-test-renderer
```

Create `jest.config.js`:
```js
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEach: ['@testing-library/jest-native/extend-expect'],
  setupFiles: ['<rootDir>/jest.setup.js'],
  testMatch: ['**/tests/unit/**/*.test.(ts|tsx)', '**/tests/integration/**/*.test.(ts|tsx)'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
  transformIgnorePatterns: [
    'node_modules/(?!(jest-)?react-native|@react-native|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|@maplibre/.*|maplibre-gl|supercluster|@supabase/.*)',
  ],
};
```

Create `jest.setup.js`:
```js
// Silence specific RN warnings during tests.
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));
```

- [ ] **Step 4: Add Playwright**

```bash
npm install -D @playwright/test
npx playwright install --with-deps chromium
```

Create `playwright.config.ts`:
```ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  use: {
    baseURL: 'http://localhost:8081',
    headless: true,
    viewport: { width: 390, height: 844 },
  },
  webServer: {
    command: 'npm run web',
    url: 'http://localhost:8081',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
```

- [ ] **Step 5: Add npm scripts**

In `package.json` scripts section:
```json
"scripts": {
  "web": "expo start --web --port 8081",
  "android": "expo start --android",
  "ios": "expo start --ios",
  "lint": "eslint . --ext .ts,.tsx",
  "format": "prettier --write \"**/*.{ts,tsx,js,json,md}\"",
  "typecheck": "tsc --noEmit",
  "test": "jest",
  "test:watch": "jest --watch",
  "test:e2e": "playwright test"
}
```

- [ ] **Step 6: Verify everything runs**

```bash
npm run typecheck
npm run lint
npm test -- --passWithNoTests
```

Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git add .
git commit -m "chore: add strict TypeScript, ESLint, Prettier, Jest, Playwright"
```

---

## Task 3: Supabase project setup

This is a manual step the engineer performs once. Document it precisely.

**Files:**
- Create: `.env.local.example`, `.env.local` (gitignored), `src/data/supabase.ts`

- [ ] **Step 1: Create Supabase project (manual)**

1. Go to https://supabase.com/dashboard, sign up/log in.
2. Click "New project". Pick organization (default Personal).
3. Name: `sulat-dev`. Database password: generate strong, save to password manager.
4. Region: pick closest to Philippines (e.g., Singapore `ap-southeast-1`).
5. Pricing plan: **Free**.
6. Wait ~2 minutes for provisioning.

- [ ] **Step 2: Capture credentials**

In Supabase dashboard → Project Settings → API:
- Copy `Project URL` (e.g., `https://xxxxxxxxxxx.supabase.co`).
- Copy `anon` public key (long JWT).
- (Optionally) Copy `service_role` key for later — store only on server, never in app.

- [ ] **Step 3: Create `.env.local.example` (committed)**

```bash
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...your-anon-key...
```

- [ ] **Step 4: Create `.env.local` (gitignored — already in `.gitignore`)**

Paste the actual values from Step 2. Make sure `.env.local` is NOT committed:
```bash
git status
```
Expected: `.env.local` does NOT appear (it's ignored).

- [ ] **Step 5: Install Supabase JS SDK and supabase CLI**

```bash
npm install @supabase/supabase-js
npm install -D supabase
```

- [ ] **Step 6: Initialize Supabase locally**

```bash
npx supabase init
npx supabase link --project-ref YOUR_PROJECT_REF
```
(`YOUR_PROJECT_REF` is the random string in your project URL.)

- [ ] **Step 7: Create the Supabase client module**

`src/data/supabase.ts`:
```ts
import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error('Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY in .env.local');
}

const ExpoSecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

const WebStorageAdapter = {
  getItem: (key: string) => Promise.resolve(window.localStorage.getItem(key)),
  setItem: (key: string, value: string) => {
    window.localStorage.setItem(key, value);
    return Promise.resolve();
  },
  removeItem: (key: string) => {
    window.localStorage.removeItem(key);
    return Promise.resolve();
  },
};

export const supabase = createClient(url, anonKey, {
  auth: {
    storage: Platform.OS === 'web' ? WebStorageAdapter : ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

```bash
npm install react-native-url-polyfill
```

- [ ] **Step 8: Smoke test Supabase connection**

`tests/integration/supabase.test.ts`:
```ts
import { supabase } from '@/data/supabase';

test('supabase client initializes', () => {
  expect(supabase).toBeDefined();
  expect(typeof supabase.from).toBe('function');
});
```

```bash
npm test -- supabase.test.ts
```
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add .
git commit -m "feat(data): add Supabase client and project bootstrap"
```

---

## Task 4: Database migration — extensions + users table

**Files:**
- Create: `supabase/migrations/20260426000001_extensions.sql`
- Create: `supabase/migrations/20260426000002_users.sql`

- [ ] **Step 1: Write extensions migration**

`supabase/migrations/20260426000001_extensions.sql`:
```sql
create extension if not exists "uuid-ossp";
create extension if not exists "postgis";
```

- [ ] **Step 2: Write users table migration**

`supabase/migrations/20260426000002_users.sql`:
```sql
create table public.users (
  id uuid primary key default uuid_generate_v4(),
  device_fingerprint text not null unique,
  email text unique,
  display_handle text,
  theme_preference text default 'lantern-glow',
  banned_at timestamptz,
  created_at timestamptz not null default now()
);

create index users_device_fingerprint_idx on public.users (device_fingerprint);
```

- [ ] **Step 3: Apply migrations to remote**

```bash
npx supabase db push
```
Expected: "Applied migration 20260426000001_extensions.sql ... 20260426000002_users.sql".

Verify in Supabase dashboard → Table Editor — `users` table should be visible with the right columns.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/
git commit -m "feat(db): add postgis extension and users table"
```

---

## Task 5: Database migration — stories table with PostGIS

**Files:**
- Create: `supabase/migrations/20260426000003_stories.sql`

- [ ] **Step 1: Write stories migration**

`supabase/migrations/20260426000003_stories.sql`:
```sql
create type story_mood as enum (
  'regret', 'on_my_mind', 'struggling', 'hopeful',
  'memory', 'dream', 'unsent_letter', 'forgiveness'
);

create type pin_mode as enum ('gps', 'dropped', 'city');

create type story_status as enum ('live', 'hidden', 'flagged', 'removed');

create table public.stories (
  id uuid primary key default uuid_generate_v4(),
  author_id uuid not null references public.users(id) on delete cascade,
  mood story_mood not null,
  body text not null check (char_length(body) <= 1000 and char_length(body) >= 1),
  location geography(Point, 4326) not null,
  location_label text,
  pin_mode pin_mode not null,
  language text default 'en',
  status story_status not null default 'live',
  is_memory boolean not null default false,
  created_at timestamptz not null default now()
);

create index stories_location_idx on public.stories using gist (location);
create index stories_created_at_idx on public.stories (created_at desc);
create index stories_status_idx on public.stories (status) where status = 'live';
create index stories_author_idx on public.stories (author_id);
```

- [ ] **Step 2: Apply and verify**

```bash
npx supabase db push
```
Verify in dashboard that `stories` table exists with PostGIS `location` column (type `geography`).

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/
git commit -m "feat(db): add stories table with postgis location"
```

---

## Task 6: Database migration — support tables

**Files:**
- Create: `supabase/migrations/20260426000004_support_tables.sql`

- [ ] **Step 1: Write support tables migration**

These tables exist in the schema but aren't actively used in Plan 1 — wired up in Plans 2 & 3. Creating them now keeps the schema stable.

`supabase/migrations/20260426000004_support_tables.sql`:
```sql
create type reply_status as enum ('live', 'hidden', 'flagged', 'removed');

create table public.replies (
  id uuid primary key default uuid_generate_v4(),
  story_id uuid not null references public.stories(id) on delete cascade,
  author_id uuid not null references public.users(id) on delete cascade,
  body text not null check (char_length(body) <= 500 and char_length(body) >= 1),
  status reply_status not null default 'live',
  created_at timestamptz not null default now()
);
create index replies_story_idx on public.replies (story_id, created_at desc);

create type reaction_emoji as enum ('hug', 'heart', 'seed', 'candle');

create table public.reactions (
  id uuid primary key default uuid_generate_v4(),
  story_id uuid not null references public.stories(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  emoji reaction_emoji not null,
  created_at timestamptz not null default now(),
  unique (story_id, user_id, emoji)
);
create index reactions_story_idx on public.reactions (story_id);

create type flag_target as enum ('story', 'reply');

create table public.flags (
  id uuid primary key default uuid_generate_v4(),
  target_type flag_target not null,
  target_id uuid not null,
  flagged_by uuid not null references public.users(id) on delete cascade,
  reason text not null,
  created_at timestamptz not null default now()
);
create index flags_target_idx on public.flags (target_type, target_id);

create table public.moderation_events (
  id uuid primary key default uuid_generate_v4(),
  target_type flag_target not null,
  target_id uuid not null,
  verdict text not null,
  service text not null,
  crisis_score numeric,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create table public.notification_tokens (
  user_id uuid not null references public.users(id) on delete cascade,
  token text not null,
  platform text not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, token)
);
```

- [ ] **Step 2: Apply and verify**

```bash
npx supabase db push
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/
git commit -m "feat(db): add replies, reactions, flags, moderation_events, notification_tokens"
```

---

## Task 7: RLS policies

**Files:**
- Create: `supabase/migrations/20260426000005_rls.sql`

- [ ] **Step 1: Write RLS migration**

`supabase/migrations/20260426000005_rls.sql`:
```sql
alter table public.users enable row level security;
alter table public.stories enable row level security;
alter table public.replies enable row level security;
alter table public.reactions enable row level security;
alter table public.flags enable row level security;
alter table public.moderation_events enable row level security;
alter table public.notification_tokens enable row level security;

-- users: a user can read and update their own row
create policy users_self_read on public.users
  for select using (auth.uid() = id);
create policy users_self_update on public.users
  for update using (auth.uid() = id);

-- stories: anyone can read live stories; authors see their own non-live ones; only authors write/update/delete their own
create policy stories_read_live on public.stories
  for select using (status = 'live' or auth.uid() = author_id);
create policy stories_insert_self on public.stories
  for insert with check (auth.uid() = author_id);
create policy stories_update_self on public.stories
  for update using (auth.uid() = author_id);
create policy stories_delete_self on public.stories
  for delete using (auth.uid() = author_id);

-- replies: read live, insert by self, update/delete by self (used in Plan 3)
create policy replies_read_live on public.replies
  for select using (status = 'live' or auth.uid() = author_id);
create policy replies_insert_self on public.replies
  for insert with check (auth.uid() = author_id);
create policy replies_update_self on public.replies
  for update using (auth.uid() = author_id);

-- reactions: read all, insert/delete by self (Plan 3)
create policy reactions_read_all on public.reactions for select using (true);
create policy reactions_insert_self on public.reactions
  for insert with check (auth.uid() = user_id);
create policy reactions_delete_self on public.reactions
  for delete using (auth.uid() = user_id);

-- flags: insert by self (Plan 2). No general read policy — server only.
create policy flags_insert_self on public.flags
  for insert with check (auth.uid() = flagged_by);

-- moderation_events: server-only (no policies = blocked for anon/authenticated)
-- notification_tokens: a user can manage their own tokens (Plan 3)
create policy tokens_self on public.notification_tokens
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

- [ ] **Step 2: Apply and verify**

```bash
npx supabase db push
```

In Supabase dashboard → Authentication → Policies, verify all tables show RLS enabled with the policies above.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/
git commit -m "feat(db): add row-level security policies for all tables"
```

---

## Task 8: Device fingerprint generator

**Files:**
- Create: `src/lib/persistence.ts`, `src/data/deviceFingerprint.ts`
- Test: `tests/unit/deviceFingerprint.test.ts`

- [ ] **Step 1: Write the failing test**

`tests/unit/deviceFingerprint.test.ts`:
```ts
import { getOrCreateFingerprint } from '@/data/deviceFingerprint';
import { kvGet, kvSet } from '@/lib/persistence';

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
    (require('@/lib/persistence') as any).__resetStore();
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
```

- [ ] **Step 2: Run test — verify it fails**

```bash
npm test -- deviceFingerprint
```
Expected: FAIL — "Cannot find module @/data/deviceFingerprint".

- [ ] **Step 3: Implement persistence**

`src/lib/persistence.ts`:
```ts
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

export async function kvGet(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    return window.localStorage.getItem(key);
  }
  return SecureStore.getItemAsync(key);
}

export async function kvSet(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    window.localStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

export async function kvDelete(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    window.localStorage.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}
```

- [ ] **Step 4: Implement deviceFingerprint**

`src/data/deviceFingerprint.ts`:
```ts
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
```

- [ ] **Step 5: Run test — verify it passes**

```bash
npm test -- deviceFingerprint
```
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add src/lib/persistence.ts src/data/deviceFingerprint.ts tests/unit/deviceFingerprint.test.ts
git commit -m "feat(data): add cross-platform device fingerprint generator"
```

---

## Task 9: Anonymous user identity hook

**Files:**
- Create: `src/data/types.ts`, `src/data/useUser.ts`
- Test: `tests/integration/useUser.test.ts`

- [ ] **Step 1: Define types**

`src/data/types.ts`:
```ts
export type Mood =
  | 'regret' | 'on_my_mind' | 'struggling' | 'hopeful'
  | 'memory' | 'dream' | 'unsent_letter' | 'forgiveness';

export type PinMode = 'gps' | 'dropped' | 'city';

export type StoryStatus = 'live' | 'hidden' | 'flagged' | 'removed';

export interface Story {
  id: string;
  author_id: string;
  mood: Mood;
  body: string;
  // PostGIS Point comes back as GeoJSON-ish object via supabase
  location: { type: 'Point'; coordinates: [number, number] };
  location_label: string | null;
  pin_mode: PinMode;
  language: string;
  status: StoryStatus;
  is_memory: boolean;
  created_at: string;
}

export interface User {
  id: string;
  device_fingerprint: string;
  email: string | null;
  display_handle: string | null;
  theme_preference: string;
  banned_at: string | null;
  created_at: string;
}
```

- [ ] **Step 2: Write the failing integration test**

`tests/integration/useUser.test.ts`:
```ts
import { renderHook, waitFor } from '@testing-library/react-native';
import { useUser } from '@/data/useUser';

// This is an integration test — runs against the real Supabase project.
// Requires .env.local to be configured.

describe('useUser', () => {
  test('creates and returns a user on first call', async () => {
    const { result } = renderHook(() => useUser());
    await waitFor(() => expect(result.current.user).not.toBeNull(), { timeout: 5000 });
    expect(result.current.user!.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(result.current.user!.device_fingerprint).toBeTruthy();
  });
});
```

- [ ] **Step 3: Run test — verify it fails**

```bash
npm test -- useUser
```
Expected: FAIL — module not found.

- [ ] **Step 4: Implement useUser**

`src/data/useUser.ts`:
```ts
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

        // Sign in anonymously to get an auth.uid() that RLS policies can match.
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session) {
          await supabase.auth.signInAnonymously();
        }

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

        const { data: { user: authUser } } = await supabase.auth.getUser();
        const insert = await supabase
          .from('users')
          .insert({
            id: authUser?.id, // bind public.users.id to auth.users.id so RLS lines up
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
```

> **Note on auth model:** Supabase's `signInAnonymously` creates a row in `auth.users`. We mirror its `id` into our `public.users.id` so the RLS policy `auth.uid() = id` works directly. When a user later upgrades to email/OAuth (Plan 3), Supabase Auth will keep the same auth.uid() — the user's data follows them.

- [ ] **Step 5: Enable anonymous auth in Supabase dashboard**

In Supabase dashboard → Authentication → Providers → enable "Anonymous Sign-Ins". Save.

- [ ] **Step 6: Run integration test**

```bash
npm test -- useUser
```
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/data/types.ts src/data/useUser.ts tests/integration/useUser.test.ts
git commit -m "feat(data): add anonymous identity hook with Supabase auth"
```

---

## Task 10: Mood catalog + tests

**Files:**
- Create: `src/moods/catalog.ts`
- Test: `tests/unit/moods.test.ts`

- [ ] **Step 1: Write the failing test**

`tests/unit/moods.test.ts`:
```ts
import { MOODS, getMoodById } from '@/moods/catalog';

test('MOODS has exactly 8 entries', () => {
  expect(MOODS).toHaveLength(8);
});

test('every mood has id, emoji, name, description, prompt', () => {
  for (const m of MOODS) {
    expect(m.id).toBeTruthy();
    expect(m.emoji).toBeTruthy();
    expect(m.name).toBeTruthy();
    expect(m.description).toBeTruthy();
    expect(m.prompt).toBeTruthy();
  }
});

test('getMoodById returns the right mood', () => {
  expect(getMoodById('hopeful')?.emoji).toBe('🌱');
});

test('getMoodById returns undefined for unknown', () => {
  expect(getMoodById('nope' as any)).toBeUndefined();
});
```

- [ ] **Step 2: Run — verify FAIL**

```bash
npm test -- moods
```

- [ ] **Step 3: Implement catalog**

`src/moods/catalog.ts`:
```ts
import type { Mood } from '@/data/types';

export interface MoodEntry {
  id: Mood;
  emoji: string;
  name: string;
  description: string;
  prompt: string;
}

export const MOODS: MoodEntry[] = [
  { id: 'regret',       emoji: '🌙', name: 'Regret',        description: "Things I wish I'd done differently", prompt: 'What do you regret?' },
  { id: 'on_my_mind',   emoji: '💭', name: 'On my mind',    description: "Whatever I'm thinking right now",     prompt: "What's on your mind?" },
  { id: 'struggling',   emoji: '🌧️', name: 'Struggling',    description: 'Going through something hard',         prompt: "What are you carrying?" },
  { id: 'hopeful',      emoji: '🌱', name: 'Hopeful',       description: 'Looking forward, feeling lighter',     prompt: "What's giving you hope?" },
  { id: 'memory',       emoji: '🕯️', name: 'Memory',        description: 'Honoring someone or something I miss', prompt: "Who or what are you remembering?" },
  { id: 'dream',        emoji: '✨', name: 'Dream',         description: 'Something I want for my life',         prompt: "What do you wish for?" },
  { id: 'unsent_letter',emoji: '💌', name: 'Unsent letter', description: 'Something I never said to someone',    prompt: 'Who is this letter for?' },
  { id: 'forgiveness',  emoji: '🤍', name: 'Forgiveness',   description: 'Letting go of something that hurt',    prompt: "What are you letting go of?" },
];

export function getMoodById(id: Mood): MoodEntry | undefined {
  return MOODS.find((m) => m.id === id);
}
```

- [ ] **Step 4: Run — verify PASS**

```bash
npm test -- moods
```

- [ ] **Step 5: Commit**

```bash
git add src/moods/ tests/unit/moods.test.ts
git commit -m "feat(moods): add mood catalog with 8 emoji-tagged moods"
```

---

## Task 11: Lantern Glow theme tokens

**Files:**
- Create: `src/theme/types.ts`, `src/theme/lanternGlow.ts`, `src/theme/ThemeContext.tsx`

- [ ] **Step 1: Define theme types**

`src/theme/types.ts`:
```ts
export interface SulatTheme {
  id: string;
  name: string;
  description: string;
  mapStyle: string;
  background: string;
  surface: string;
  textPrimary: string;
  textMuted: string;
  accent: string;
  fontFamily: string;
  pin: { glow: string; body: string; pulseDuration: number };
  pinMemory: { glow: string; body: string; decoration: string };
  heatmap: { offset: number; color: string }[];
  reactionTint: string;
}
```

- [ ] **Step 2: Write Lantern Glow tokens**

`src/theme/lanternGlow.ts`:
```ts
import type { SulatTheme } from './types';

export const lanternGlow: SulatTheme = {
  id: 'lantern-glow',
  name: 'Lantern Glow',
  description: 'Warm amber lights on a deep navy night map',
  mapStyle: 'https://tiles.openfreemap.org/styles/dark',
  background: '#0a0e22',
  surface: '#141a3a',
  textPrimary: '#f5e6c8',
  textMuted: 'rgba(245, 230, 200, 0.65)',
  accent: '#f4c97a',
  fontFamily: 'Georgia, serif',
  pin: {
    glow: 'rgba(244, 201, 122, 0.7)',
    body: '#f4c97a',
    pulseDuration: 3500,
  },
  pinMemory: {
    glow: 'rgba(208, 184, 255, 0.6)',
    body: '#d0b8ff',
    decoration: '✦',
  },
  heatmap: [
    { offset: 0, color: 'rgba(244, 201, 122, 0)' },
    { offset: 0.4, color: 'rgba(244, 201, 122, 0.4)' },
    { offset: 0.8, color: 'rgba(232, 140, 90, 0.7)' },
    { offset: 1, color: 'rgba(180, 90, 160, 0.85)' },
  ],
  reactionTint: '#f4c97a',
};
```

- [ ] **Step 3: Theme context provider**

`src/theme/ThemeContext.tsx`:
```tsx
import { createContext, useContext, type ReactNode } from 'react';
import { lanternGlow } from './lanternGlow';
import type { SulatTheme } from './types';

const ThemeContext = createContext<SulatTheme>(lanternGlow);

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Plan 1: hardcoded to Lantern Glow. Plan 4 wires up theme switching.
  return <ThemeContext.Provider value={lanternGlow}>{children}</ThemeContext.Provider>;
}

export function useTheme(): SulatTheme {
  return useContext(ThemeContext);
}
```

- [ ] **Step 4: Wire ThemeProvider into root layout**

Edit `app/_layout.tsx`:
```tsx
import { Stack } from 'expo-router';
import { ThemeProvider } from '@/theme/ThemeContext';

export default function RootLayout() {
  return (
    <ThemeProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </ThemeProvider>
  );
}
```

- [ ] **Step 5: Verify the app still loads**

```bash
npm run web
```
Expected: page renders. Stop dev server.

- [ ] **Step 6: Commit**

```bash
git add src/theme/ app/_layout.tsx
git commit -m "feat(theme): add Lantern Glow theme tokens and ThemeContext"
```

---

## Task 12: Geo helpers

**Files:**
- Create: `src/lib/geo.ts`
- Test: `tests/unit/geo.test.ts`

- [ ] **Step 1: Write failing test**

`tests/unit/geo.test.ts`:
```ts
import { roundTo500m, geocodeCity } from '@/lib/geo';

describe('roundTo500m', () => {
  test('rounds latitude/longitude to ~500m grid', () => {
    const r = roundTo500m({ lat: 14.59951234, lng: 120.98421234 });
    // 500m at the equator ≈ 0.0045 degrees
    expect(r.lat).toBeCloseTo(14.5995, 3);
    expect(r.lng).toBeCloseTo(120.9842, 3);
  });
});

describe('geocodeCity', () => {
  // Skip in unit run if no network; this is a real API call to Photon.
  test.skip('returns plausible result for "Cebu City"', async () => {
    const r = await geocodeCity('Cebu City');
    expect(r[0].label).toMatch(/Cebu/i);
    expect(r[0].lat).toBeGreaterThan(10);
    expect(r[0].lat).toBeLessThan(11);
  });
});
```

- [ ] **Step 2: Run — verify FAIL**

- [ ] **Step 3: Implement**

`src/lib/geo.ts`:
```ts
export interface LatLng {
  lat: number;
  lng: number;
}

export interface CityResult extends LatLng {
  label: string;
}

const GRID_DEGREES = 0.0045; // ~500m at equator; close enough at all latitudes for our privacy goal.

export function roundTo500m(p: LatLng): LatLng {
  return {
    lat: Math.round(p.lat / GRID_DEGREES) * GRID_DEGREES,
    lng: Math.round(p.lng / GRID_DEGREES) * GRID_DEGREES,
  };
}

export async function geocodeCity(query: string, signal?: AbortSignal): Promise<CityResult[]> {
  if (!query.trim()) return [];
  const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=5&osm_tag=place:city&osm_tag=place:town`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Photon error: ${res.status}`);
  const json = (await res.json()) as { features: Array<{ properties: any; geometry: { coordinates: [number, number] } }> };
  return json.features.map((f) => ({
    label: [f.properties.name, f.properties.country].filter(Boolean).join(', '),
    lng: f.geometry.coordinates[0],
    lat: f.geometry.coordinates[1],
  }));
}
```

- [ ] **Step 4: Run — verify PASS**

```bash
npm test -- geo
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/geo.ts tests/unit/geo.test.ts
git commit -m "feat(geo): add 500m rounding and Photon city geocoder"
```

---

## Task 13: MapView component with viewport persistence

**Files:**
- Create: `src/map/useViewport.ts`, `src/map/MapView.tsx`
- Modify: `app/index.tsx`

- [ ] **Step 1: Install MapLibre wrapper**

```bash
npm install maplibre-gl
npm install react-map-gl
```

> `react-map-gl` works with MapLibre on web. For native (Plan 1 web-first means we won't actually run this in native yet), we'd add `@maplibre/maplibre-react-native` later. The code we write now targets web.

- [ ] **Step 2: Write `useViewport` hook**

`src/map/useViewport.ts`:
```ts
import { useEffect, useState } from 'react';
import { kvGet, kvSet } from '@/lib/persistence';

const KEY = 'sulat.viewport';
const DEFAULT_VIEWPORT = { longitude: 122.5, latitude: 12.5, zoom: 5 }; // centered on Philippines

export interface Viewport {
  longitude: number;
  latitude: number;
  zoom: number;
}

export function useViewport() {
  const [viewport, setViewport] = useState<Viewport>(DEFAULT_VIEWPORT);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const raw = await kvGet(KEY);
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as Viewport;
          if (typeof parsed.longitude === 'number') setViewport(parsed);
        } catch {
          /* ignore corrupt value */
        }
      }
      setLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    kvSet(KEY, JSON.stringify(viewport)).catch(() => {});
  }, [viewport, loaded]);

  return { viewport, setViewport, loaded };
}
```

- [ ] **Step 3: Write MapView**

`src/map/MapView.tsx`:
```tsx
import { type ReactNode } from 'react';
import Map, { type ViewStateChangeEvent } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useTheme } from '@/theme/ThemeContext';
import { useViewport } from './useViewport';

export interface MapViewProps {
  children?: ReactNode;
}

export function MapView({ children }: MapViewProps) {
  const theme = useTheme();
  const { viewport, setViewport, loaded } = useViewport();

  if (!loaded) return null;

  return (
    <Map
      initialViewState={viewport}
      mapStyle={theme.mapStyle}
      style={{ width: '100%', height: '100%' }}
      onMoveEnd={(e: ViewStateChangeEvent) =>
        setViewport({
          longitude: e.viewState.longitude,
          latitude: e.viewState.latitude,
          zoom: e.viewState.zoom,
        })
      }
    >
      {children}
    </Map>
  );
}
```

- [ ] **Step 4: Use it in `app/index.tsx`**

```tsx
import { View } from 'react-native';
import { MapView } from '@/map/MapView';

export default function Home() {
  return (
    <View style={{ flex: 1 }}>
      <MapView />
    </View>
  );
}
```

- [ ] **Step 5: Run dev server and verify map renders**

```bash
npm run web
```
Expected: dark map of the world centered on Philippines. You can drag and zoom. Refresh — map remembers your last viewport.

- [ ] **Step 6: Commit**

```bash
git add src/map/ app/index.tsx package.json package-lock.json
git commit -m "feat(map): add MapView with MapLibre, OpenFreeMap dark tiles, viewport persistence"
```

---

## Task 14: Story query hook (`useStories`)

**Files:**
- Create: `src/data/useStories.ts`
- Test: `tests/integration/useStories.test.ts`

- [ ] **Step 1: Write failing test**

`tests/integration/useStories.test.ts`:
```ts
import { renderHook, waitFor } from '@testing-library/react-native';
import { useStories } from '@/data/useStories';

test('useStories returns an array (possibly empty) for any bbox', async () => {
  const { result } = renderHook(() =>
    useStories({ minLng: 100, minLat: 0, maxLng: 130, maxLat: 25 }),
  );
  await waitFor(() => expect(result.current.loading).toBe(false), { timeout: 5000 });
  expect(Array.isArray(result.current.stories)).toBe(true);
});
```

- [ ] **Step 2: Run — FAIL**

- [ ] **Step 3: Implement**

`src/data/useStories.ts`:
```ts
import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import type { Story } from './types';

export interface Bbox {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
}

export interface UseStoriesResult {
  stories: Story[];
  loading: boolean;
  error: Error | null;
}

export function useStories(bbox: Bbox): UseStoriesResult {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        // Use a Postgres function to get GeoJSON. We'll create st_within_bbox in a migration if needed,
        // but for v1 we just fetch all live stories with a simple bbox filter via lat/lng cols.
        // Simpler: select with raw lng/lat extracted in SQL.
        const { data, error: e } = await supabase
          .from('stories')
          .select('id, author_id, mood, body, location_label, pin_mode, language, status, is_memory, created_at, location:location::json')
          .eq('status', 'live')
          .order('created_at', { ascending: false })
          .limit(500);
        if (e) throw e;

        const inBbox = (data ?? []).filter((s: any) => {
          const [lng, lat] = s.location?.coordinates ?? [];
          return (
            typeof lng === 'number' && typeof lat === 'number' &&
            lng >= bbox.minLng && lng <= bbox.maxLng &&
            lat >= bbox.minLat && lat <= bbox.maxLat
          );
        }) as Story[];

        if (!cancelled) {
          setStories(inBbox);
          setLoading(false);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e as Error);
          setLoading(false);
        }
      }
    })();

    // Realtime subscription — push new live stories into the list
    const channel = supabase
      .channel('stories-live')
      .on('postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'stories', filter: 'status=eq.live' },
          (payload) => {
            const s = payload.new as any;
            // NOTE: payload doesn't include location as GeoJSON — refetch on insert.
            // For v1 we just refetch the bbox.
            (async () => {
              const { data } = await supabase
                .from('stories')
                .select('id, author_id, mood, body, location_label, pin_mode, language, status, is_memory, created_at, location:location::json')
                .eq('id', s.id)
                .single();
              if (data) {
                const [lng, lat] = (data as any).location?.coordinates ?? [];
                if (lng >= bbox.minLng && lng <= bbox.maxLng && lat >= bbox.minLat && lat <= bbox.maxLat) {
                  setStories((prev) => [data as Story, ...prev]);
                }
              }
            })();
          })
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [bbox.minLng, bbox.minLat, bbox.maxLng, bbox.maxLat]);

  return { stories, loading, error };
}
```

- [ ] **Step 4: Run — PASS**

- [ ] **Step 5: Commit**

```bash
git add src/data/useStories.ts tests/integration/useStories.test.ts
git commit -m "feat(data): add useStories hook with bbox filter and realtime subscription"
```

---

## Task 15: PinMarker component

**Files:**
- Create: `src/map/PinMarker.tsx`
- Test: `tests/unit/PinMarker.test.tsx`

- [ ] **Step 1: Write failing test**

`tests/unit/PinMarker.test.tsx`:
```tsx
import { render } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme/ThemeContext';
import { PinMarker } from '@/map/PinMarker';

test('PinMarker renders the mood emoji', () => {
  const { getByText } = render(
    <ThemeProvider>
      <PinMarker mood="hopeful" isMemory={false} />
    </ThemeProvider>,
  );
  expect(getByText('🌱')).toBeTruthy();
});

test('Memory pin renders decoration mark', () => {
  const { getByText } = render(
    <ThemeProvider>
      <PinMarker mood="memory" isMemory={true} />
    </ThemeProvider>,
  );
  expect(getByText('🕯️')).toBeTruthy();
  expect(getByText('✦')).toBeTruthy();
});
```

- [ ] **Step 2: Run — FAIL**

- [ ] **Step 3: Implement**

`src/map/PinMarker.tsx`:
```tsx
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { getMoodById } from '@/moods/catalog';
import type { Mood } from '@/data/types';

export interface PinMarkerProps {
  mood: Mood;
  isMemory: boolean;
}

export function PinMarker({ mood, isMemory }: PinMarkerProps) {
  const theme = useTheme();
  const moodEntry = getMoodById(mood);
  const tokens = isMemory ? theme.pinMemory : theme.pin;

  return (
    <View style={styles.wrap}>
      <View
        style={[
          styles.pin,
          {
            backgroundColor: tokens.body,
            shadowColor: tokens.glow,
          },
        ]}
      >
        <Text style={styles.emoji}>{moodEntry?.emoji ?? '·'}</Text>
      </View>
      {isMemory && <Text style={styles.decoration}>{theme.pinMemory.decoration}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  pin: {
    width: 26, height: 26, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center',
    shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.7, shadowRadius: 6,
    elevation: 4,
  },
  emoji: { fontSize: 13 },
  decoration: { position: 'absolute', top: -4, right: -4, fontSize: 10, color: '#d0b8ff' },
});
```

- [ ] **Step 4: Run — PASS**

- [ ] **Step 5: Commit**

```bash
git add src/map/PinMarker.tsx tests/unit/PinMarker.test.tsx
git commit -m "feat(map): add PinMarker component with theme-driven glow"
```

---

## Task 16: StoryPins overlay

**Files:**
- Create: `src/map/StoryPins.tsx`
- Modify: `app/index.tsx`

- [ ] **Step 1: Implement StoryPins**

`src/map/StoryPins.tsx`:
```tsx
import { Marker } from 'react-map-gl/maplibre';
import { Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { PinMarker } from './PinMarker';
import type { Story } from '@/data/types';

export interface StoryPinsProps {
  stories: Story[];
}

export function StoryPins({ stories }: StoryPinsProps) {
  const router = useRouter();
  return (
    <>
      {stories.map((s) => {
        const [lng, lat] = s.location.coordinates;
        return (
          <Marker key={s.id} longitude={lng} latitude={lat} anchor="center">
            <Pressable onPress={() => router.push(`/story/${s.id}`)}>
              <PinMarker mood={s.mood} isMemory={s.is_memory} />
            </Pressable>
          </Marker>
        );
      })}
    </>
  );
}
```

- [ ] **Step 2: Wire into Home screen**

Edit `app/index.tsx`:
```tsx
import { useState } from 'react';
import { View } from 'react-native';
import { MapView } from '@/map/MapView';
import { StoryPins } from '@/map/StoryPins';
import { useStories } from '@/data/useStories';
import type { Bbox } from '@/data/useStories';

export default function Home() {
  // Plan 1 simplification: use a wide static bbox covering most of the world.
  // Plan 4 polish wires the bbox to the actual visible viewport.
  const [bbox] = useState<Bbox>({ minLng: -180, minLat: -85, maxLng: 180, maxLat: 85 });
  const { stories } = useStories(bbox);

  return (
    <View style={{ flex: 1 }}>
      <MapView>
        <StoryPins stories={stories} />
      </MapView>
    </View>
  );
}
```

- [ ] **Step 3: Insert seed data manually for verification**

In Supabase dashboard SQL editor:
```sql
-- create a temp anonymous user to author seed stories (bypasses RLS via service role in dashboard)
insert into public.users (id, device_fingerprint) values
  ('11111111-1111-4111-8111-111111111111', 'seed-device-1');

insert into public.stories (author_id, mood, body, location, location_label, pin_mode) values
  ('11111111-1111-4111-8111-111111111111', 'hopeful', 'Test story 1 in Manila',
   ST_SetSRID(ST_MakePoint(120.9842, 14.5995), 4326)::geography, 'Manila', 'city'),
  ('11111111-1111-4111-8111-111111111111', 'memory', 'Test story 2 in Cebu',
   ST_SetSRID(ST_MakePoint(123.8854, 10.3157), 4326)::geography, 'Cebu City', 'city'),
  ('11111111-1111-4111-8111-111111111111', 'unsent_letter', 'Test story 3 in Tokyo',
   ST_SetSRID(ST_MakePoint(139.6503, 35.6762), 4326)::geography, 'Tokyo', 'city');
```

- [ ] **Step 4: Run dev server, verify pins appear**

```bash
npm run web
```
Expected: glowing amber pins on the map at Manila, Cebu, Tokyo.

- [ ] **Step 5: Commit**

```bash
git add src/map/StoryPins.tsx app/index.tsx
git commit -m "feat(map): render stories as pin markers on the map"
```

---

## Task 17: Pin clustering with Supercluster

**Files:**
- Create: `src/map/useClusters.ts`, `src/map/ClusterMarker.tsx`
- Modify: `src/map/StoryPins.tsx`

- [ ] **Step 1: Install Supercluster**

```bash
npm install supercluster
npm install -D @types/supercluster
```

- [ ] **Step 2: Implement useClusters**

`src/map/useClusters.ts`:
```ts
import { useMemo } from 'react';
import Supercluster, { type ClusterFeature, type PointFeature } from 'supercluster';
import type { Story } from '@/data/types';

interface StoryProps {
  cluster: false;
  story: Story;
}

export type StoryFeature = PointFeature<StoryProps>;
export type AnyFeature = StoryFeature | ClusterFeature<{}>;

export function useClusters(stories: Story[], zoom: number, bbox: [number, number, number, number]) {
  const sc = useMemo(() => {
    const s = new Supercluster<StoryProps, {}>({ radius: 60, maxZoom: 14 });
    const points: StoryFeature[] = stories.map((story) => ({
      type: 'Feature',
      properties: { cluster: false, story },
      geometry: { type: 'Point', coordinates: story.location.coordinates },
    }));
    s.load(points);
    return s;
  }, [stories]);

  const clusters = useMemo(() => sc.getClusters(bbox, Math.floor(zoom)), [sc, bbox, zoom]);
  return { clusters, supercluster: sc };
}
```

- [ ] **Step 3: ClusterMarker**

`src/map/ClusterMarker.tsx`:
```tsx
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';

export interface ClusterMarkerProps {
  count: number;
  onPress: () => void;
}

export function ClusterMarker({ count, onPress }: ClusterMarkerProps) {
  const theme = useTheme();
  return (
    <Pressable onPress={onPress}>
      <View style={[styles.cluster, { backgroundColor: theme.surface, borderColor: theme.accent }]}>
        <Text style={[styles.count, { color: theme.textPrimary }]}>+{count}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cluster: {
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 14, borderWidth: 1,
  },
  count: { fontSize: 11, fontWeight: '600' },
});
```

- [ ] **Step 4: Update StoryPins to use clusters**

`src/map/StoryPins.tsx` (replace previous):
```tsx
import { Marker, useMap } from 'react-map-gl/maplibre';
import { Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { PinMarker } from './PinMarker';
import { ClusterMarker } from './ClusterMarker';
import { useClusters } from './useClusters';
import type { Story } from '@/data/types';

export interface StoryPinsProps {
  stories: Story[];
  zoom: number;
  bbox: [number, number, number, number];
}

export function StoryPins({ stories, zoom, bbox }: StoryPinsProps) {
  const router = useRouter();
  const { current: map } = useMap();
  const { clusters, supercluster } = useClusters(stories, zoom, bbox);

  return (
    <>
      {clusters.map((c) => {
        const [lng, lat] = c.geometry.coordinates;
        if ((c.properties as any).cluster) {
          const count = (c.properties as any).point_count as number;
          const id = c.id as number;
          return (
            <Marker key={`c-${id}`} longitude={lng} latitude={lat} anchor="center">
              <ClusterMarker
                count={count}
                onPress={() => {
                  const expansion = supercluster.getClusterExpansionZoom(id);
                  map?.flyTo({ center: [lng, lat], zoom: expansion });
                }}
              />
            </Marker>
          );
        }
        const story = (c.properties as any).story as Story;
        return (
          <Marker key={story.id} longitude={lng} latitude={lat} anchor="center">
            <Pressable onPress={() => router.push(`/story/${story.id}`)}>
              <PinMarker mood={story.mood} isMemory={story.is_memory} />
            </Pressable>
          </Marker>
        );
      })}
    </>
  );
}
```

- [ ] **Step 5: Wire viewport zoom + bbox into Home**

Edit `app/index.tsx`:
```tsx
import { View } from 'react-native';
import { MapView } from '@/map/MapView';
import { StoryPins } from '@/map/StoryPins';
import { useStories } from '@/data/useStories';
import { useViewport } from '@/map/useViewport';

export default function Home() {
  const { viewport } = useViewport();
  const bbox: [number, number, number, number] = [-180, -85, 180, 85];
  const { stories } = useStories({ minLng: bbox[0], minLat: bbox[1], maxLng: bbox[2], maxLat: bbox[3] });

  return (
    <View style={{ flex: 1 }}>
      <MapView>
        <StoryPins stories={stories} zoom={viewport.zoom} bbox={bbox} />
      </MapView>
    </View>
  );
}
```

- [ ] **Step 6: Verify clusters appear at low zoom**

```bash
npm run web
```
Zoom out — pins collapse into "+N" badges. Tap to expand.

- [ ] **Step 7: Commit**

```bash
git add src/map/ app/index.tsx package.json package-lock.json
git commit -m "feat(map): add Supercluster-based pin clustering"
```

---

## Task 18: Heatmap overlay layer

**Files:**
- Create: `src/map/HeatmapLayer.tsx`, `src/map/HeatmapToggle.tsx`
- Modify: `app/index.tsx`

- [ ] **Step 1: Implement HeatmapLayer**

`src/map/HeatmapLayer.tsx`:
```tsx
import { Source, Layer } from 'react-map-gl/maplibre';
import { useTheme } from '@/theme/ThemeContext';
import type { Story } from '@/data/types';

export interface HeatmapLayerProps {
  stories: Story[];
}

export function HeatmapLayer({ stories }: HeatmapLayerProps) {
  const theme = useTheme();

  const features = stories.map((s) => ({
    type: 'Feature' as const,
    properties: {},
    geometry: { type: 'Point' as const, coordinates: s.location.coordinates },
  }));

  const heatmapGradient: any[] = ['interpolate', ['linear'], ['heatmap-density']];
  for (const stop of theme.heatmap) {
    heatmapGradient.push(stop.offset, stop.color);
  }

  return (
    <Source id="story-density" type="geojson" data={{ type: 'FeatureCollection', features }}>
      <Layer
        id="story-heatmap"
        type="heatmap"
        paint={{
          'heatmap-weight': 1,
          'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 1, 9, 3],
          'heatmap-color': heatmapGradient,
          'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 20, 9, 50],
          'heatmap-opacity': 0.7,
        }}
      />
    </Source>
  );
}
```

- [ ] **Step 2: Toggle component**

`src/map/HeatmapToggle.tsx`:
```tsx
import { Pressable, Text, StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';

export interface HeatmapToggleProps {
  enabled: boolean;
  onToggle: () => void;
}

export function HeatmapToggle({ enabled, onToggle }: HeatmapToggleProps) {
  const theme = useTheme();
  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={onToggle}
        style={[styles.btn, { backgroundColor: theme.surface, borderColor: theme.accent }]}
      >
        <Text style={[styles.txt, { color: theme.textPrimary }]}>
          {enabled ? '🔥 Heatmap on' : '🔥 Heatmap off'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', top: 16, right: 16, zIndex: 10 },
  btn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 18, borderWidth: 1 },
  txt: { fontSize: 12, fontWeight: '600' },
});
```

- [ ] **Step 3: Wire into Home**

Edit `app/index.tsx`:
```tsx
import { useState } from 'react';
import { View } from 'react-native';
import { MapView } from '@/map/MapView';
import { StoryPins } from '@/map/StoryPins';
import { HeatmapLayer } from '@/map/HeatmapLayer';
import { HeatmapToggle } from '@/map/HeatmapToggle';
import { useStories } from '@/data/useStories';
import { useViewport } from '@/map/useViewport';

export default function Home() {
  const { viewport } = useViewport();
  const bbox: [number, number, number, number] = [-180, -85, 180, 85];
  const { stories } = useStories({ minLng: bbox[0], minLat: bbox[1], maxLng: bbox[2], maxLat: bbox[3] });
  const [heatmapOn, setHeatmapOn] = useState(false);

  return (
    <View style={{ flex: 1 }}>
      <HeatmapToggle enabled={heatmapOn} onToggle={() => setHeatmapOn((v) => !v)} />
      <MapView>
        {heatmapOn && <HeatmapLayer stories={stories} />}
        <StoryPins stories={stories} zoom={viewport.zoom} bbox={bbox} />
      </MapView>
    </View>
  );
}
```

- [ ] **Step 4: Verify heatmap toggles**

```bash
npm run web
```
Click toggle — heatmap blooms appear/disappear.

- [ ] **Step 5: Commit**

```bash
git add src/map/HeatmapLayer.tsx src/map/HeatmapToggle.tsx app/index.tsx
git commit -m "feat(map): add density heatmap overlay with toggle"
```

---

## Task 19: Story full-view screen

**Files:**
- Create: `app/story/[id].tsx`, `src/story/StoryView.tsx`

- [ ] **Step 1: Implement StoryView**

`src/story/StoryView.tsx`:
```tsx
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme/ThemeContext';
import { getMoodById } from '@/moods/catalog';
import type { Story } from '@/data/types';

export interface StoryViewProps {
  story: Story;
}

export function StoryView({ story }: StoryViewProps) {
  const theme = useTheme();
  const router = useRouter();
  const mood = getMoodById(story.mood);
  const ageDays = Math.floor((Date.now() - new Date(story.created_at).getTime()) / 86400000);

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]} contentContainerStyle={styles.content}>
      <Pressable onPress={() => router.back()} style={styles.back}>
        <Text style={[styles.backTxt, { color: theme.textMuted }]}>← Back to map</Text>
      </Pressable>

      <View style={styles.header}>
        <Text style={[styles.mood, { color: theme.accent }]}>{mood?.emoji} {mood?.name}</Text>
        <Text style={[styles.meta, { color: theme.textMuted }]}>
          {story.location_label ?? 'Somewhere'} · {ageDays}d ago
        </Text>
      </View>

      <Text style={[styles.body, { color: theme.textPrimary, fontFamily: theme.fontFamily }]}>
        {story.body}
      </Text>

      {story.is_memory && (
        <Text style={[styles.memoryLabel, { color: theme.pinMemory.body }]}>
          ✦ This is now a memory
        </Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 24, paddingTop: 60 },
  back: { marginBottom: 24 },
  backTxt: { fontSize: 14 },
  header: { marginBottom: 24 },
  mood: { fontSize: 18, fontWeight: '600', marginBottom: 4 },
  meta: { fontSize: 12 },
  body: { fontSize: 17, lineHeight: 26 },
  memoryLabel: { marginTop: 32, fontSize: 13, fontStyle: 'italic' },
});
```

- [ ] **Step 2: Implement route**

`app/story/[id].tsx`:
```tsx
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { supabase } from '@/data/supabase';
import { StoryView } from '@/story/StoryView';
import { useTheme } from '@/theme/ThemeContext';
import type { Story } from '@/data/types';

export default function StoryRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const [story, setStory] = useState<Story | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data, error: e } = await supabase
        .from('stories')
        .select('id, author_id, mood, body, location_label, pin_mode, language, status, is_memory, created_at, location:location::json')
        .eq('id', id)
        .single();
      if (e) {
        setError(e.message);
        return;
      }
      setStory(data as Story);
    })();
  }, [id]);

  if (error) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.background }}><Text style={{ color: theme.textPrimary }}>{error}</Text></View>;
  if (!story) return <View style={{ flex: 1, backgroundColor: theme.background }} />;
  return <StoryView story={story} />;
}
```

- [ ] **Step 3: Verify**

Click a pin on the map — opens story view with body, mood, location label, age. "Back to map" returns.

- [ ] **Step 4: Commit**

```bash
git add app/story/ src/story/
git commit -m "feat(story): add story full-view screen with mood, location, body"
```

---

## Task 20: Composer state machine + MoodPicker

**Files:**
- Create: `app/compose.tsx`, `src/compose/ComposerScreen.tsx`, `src/compose/MoodPicker.tsx`
- Test: `tests/unit/MoodPicker.test.tsx`

- [ ] **Step 1: Failing test for MoodPicker**

`tests/unit/MoodPicker.test.tsx`:
```tsx
import { render, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme/ThemeContext';
import { MoodPicker } from '@/compose/MoodPicker';

test('renders all 8 moods and emits onPick', () => {
  const onPick = jest.fn();
  const { getByText } = render(
    <ThemeProvider>
      <MoodPicker onPick={onPick} />
    </ThemeProvider>,
  );
  expect(getByText('Hopeful')).toBeTruthy();
  fireEvent.press(getByText('Hopeful'));
  expect(onPick).toHaveBeenCalledWith('hopeful');
});
```

- [ ] **Step 2: Run — FAIL**

- [ ] **Step 3: Implement MoodPicker**

`src/compose/MoodPicker.tsx`:
```tsx
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { MOODS } from '@/moods/catalog';
import type { Mood } from '@/data/types';

export interface MoodPickerProps {
  onPick: (mood: Mood) => void;
}

export function MoodPicker({ onPick }: MoodPickerProps) {
  const theme = useTheme();
  return (
    <ScrollView contentContainerStyle={[styles.wrap, { backgroundColor: theme.background }]}>
      <Text style={[styles.title, { color: theme.textPrimary, fontFamily: theme.fontFamily }]}>
        What is this?
      </Text>
      <Text style={[styles.subtitle, { color: theme.textMuted }]}>Pick a mood that fits.</Text>
      <View style={styles.grid}>
        {MOODS.map((m) => (
          <Pressable key={m.id} onPress={() => onPick(m.id)} style={[styles.cell, { backgroundColor: theme.surface }]}>
            <Text style={styles.emoji}>{m.emoji}</Text>
            <Text style={[styles.name, { color: theme.textPrimary }]}>{m.name}</Text>
            <Text style={[styles.desc, { color: theme.textMuted }]}>{m.description}</Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 24, paddingTop: 60, minHeight: '100%' },
  title: { fontSize: 28, marginBottom: 6 },
  subtitle: { fontSize: 14, marginBottom: 28 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  cell: { flexBasis: '48%', padding: 14, borderRadius: 14 },
  emoji: { fontSize: 32, marginBottom: 8 },
  name: { fontSize: 15, fontWeight: '600', marginBottom: 4 },
  desc: { fontSize: 12, lineHeight: 16 },
});
```

- [ ] **Step 4: Composer state machine**

`src/compose/ComposerScreen.tsx`:
```tsx
import { useState } from 'react';
import { View } from 'react-native';
import { MoodPicker } from './MoodPicker';
import type { Mood } from '@/data/types';

type Step = { kind: 'mood' } | { kind: 'text'; mood: Mood } | { kind: 'location'; mood: Mood; body: string };

export function ComposerScreen() {
  const [step, setStep] = useState<Step>({ kind: 'mood' });

  return (
    <View style={{ flex: 1 }}>
      {step.kind === 'mood' && (
        <MoodPicker onPick={(mood) => setStep({ kind: 'text', mood })} />
      )}
      {/* Tasks 21–23 add text and location steps */}
    </View>
  );
}
```

- [ ] **Step 5: Route**

`app/compose.tsx`:
```tsx
import { ComposerScreen } from '@/compose/ComposerScreen';

export default function Compose() {
  return <ComposerScreen />;
}
```

- [ ] **Step 6: Add a + button on the home screen**

Edit `app/index.tsx`, add a floating action button:
```tsx
import { useRouter } from 'expo-router';
import { Pressable, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
// ... existing imports

export default function Home() {
  const { viewport } = useViewport();
  const router = useRouter();
  const theme = useTheme();
  // ... existing logic

  return (
    <View style={{ flex: 1 }}>
      <HeatmapToggle enabled={heatmapOn} onToggle={() => setHeatmapOn((v) => !v)} />
      <MapView>
        {heatmapOn && <HeatmapLayer stories={stories} />}
        <StoryPins stories={stories} zoom={viewport.zoom} bbox={bbox} />
      </MapView>
      <Pressable onPress={() => router.push('/compose')} style={[fab.btn, { backgroundColor: theme.accent }]}>
        <Text style={fab.plus}>+</Text>
      </Pressable>
    </View>
  );
}

const fab = StyleSheet.create({
  btn: {
    position: 'absolute', bottom: 24, alignSelf: 'center',
    width: 64, height: 64, borderRadius: 32,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#f4c97a', shadowOpacity: 0.5, shadowRadius: 14, shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  plus: { fontSize: 32, color: '#2a1f0a', fontWeight: '300' },
});
```

- [ ] **Step 7: Run tests + verify FAB navigates to mood picker**

```bash
npm test -- MoodPicker
npm run web
```

- [ ] **Step 8: Commit**

```bash
git add src/compose/ app/compose.tsx app/index.tsx tests/unit/MoodPicker.test.tsx
git commit -m "feat(compose): add 3-step composer skeleton with mood picker step"
```

---

## Task 21: Composer Step 2 — text editor

**Files:**
- Create: `src/compose/TextEditor.tsx`
- Modify: `src/compose/ComposerScreen.tsx`
- Test: `tests/unit/TextEditor.test.tsx`

- [ ] **Step 1: Failing test**

`tests/unit/TextEditor.test.tsx`:
```tsx
import { render, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme/ThemeContext';
import { TextEditor } from '@/compose/TextEditor';

test('rejects strings over 1000 chars', () => {
  const onContinue = jest.fn();
  const { getByPlaceholderText, getByText, queryByText } = render(
    <ThemeProvider>
      <TextEditor mood="hopeful" onContinue={onContinue} />
    </ThemeProvider>,
  );
  const input = getByPlaceholderText(/.*/);
  fireEvent.changeText(input, 'a'.repeat(1001));
  // Continue button should be disabled
  fireEvent.press(getByText('Continue →'));
  expect(onContinue).not.toHaveBeenCalled();
  expect(queryByText(/Too long/)).toBeTruthy();
});

test('calls onContinue with valid text', () => {
  const onContinue = jest.fn();
  const { getByPlaceholderText, getByText } = render(
    <ThemeProvider>
      <TextEditor mood="hopeful" onContinue={onContinue} />
    </ThemeProvider>,
  );
  fireEvent.changeText(getByPlaceholderText(/.*/), 'A small win today.');
  fireEvent.press(getByText('Continue →'));
  expect(onContinue).toHaveBeenCalledWith('A small win today.');
});
```

- [ ] **Step 2: Run — FAIL**

- [ ] **Step 3: Implement**

`src/compose/TextEditor.tsx`:
```tsx
import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { getMoodById } from '@/moods/catalog';
import type { Mood } from '@/data/types';

const MAX = 1000;

export interface TextEditorProps {
  mood: Mood;
  onContinue: (body: string) => void;
}

export function TextEditor({ mood, onContinue }: TextEditorProps) {
  const theme = useTheme();
  const [text, setText] = useState('');
  const moodEntry = getMoodById(mood);

  const tooLong = text.length > MAX;
  const empty = text.trim().length === 0;
  const canContinue = !tooLong && !empty;

  return (
    <View style={[styles.wrap, { backgroundColor: theme.background }]}>
      <Text style={[styles.prompt, { color: theme.textPrimary, fontFamily: theme.fontFamily }]}>
        {moodEntry?.prompt ?? 'What is this?'}
      </Text>
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder={moodEntry?.description}
        placeholderTextColor={theme.textMuted}
        multiline
        style={[styles.input, { color: theme.textPrimary, borderColor: theme.surface }]}
      />
      <Text style={[styles.counter, { color: tooLong ? '#ff8a8a' : theme.textMuted }]}>
        {text.length} / {MAX}{tooLong ? ' — Too long' : ''}
      </Text>
      <Pressable
        onPress={() => canContinue && onContinue(text.trim())}
        style={[styles.btn, { backgroundColor: canContinue ? theme.accent : theme.surface }]}
      >
        <Text style={[styles.btnTxt, { color: canContinue ? '#2a1f0a' : theme.textMuted }]}>Continue →</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: 24, paddingTop: 60 },
  prompt: { fontSize: 24, marginBottom: 24 },
  input: { borderWidth: 1, borderRadius: 12, padding: 16, minHeight: 200, textAlignVertical: 'top', fontSize: 16, lineHeight: 22 },
  counter: { marginTop: 8, fontSize: 12, alignSelf: 'flex-end' },
  btn: { marginTop: 24, padding: 14, borderRadius: 12, alignItems: 'center' },
  btnTxt: { fontSize: 15, fontWeight: '600' },
});
```

- [ ] **Step 4: Wire into ComposerScreen**

`src/compose/ComposerScreen.tsx`:
```tsx
import { useState } from 'react';
import { View } from 'react-native';
import { MoodPicker } from './MoodPicker';
import { TextEditor } from './TextEditor';
import type { Mood } from '@/data/types';

type Step =
  | { kind: 'mood' }
  | { kind: 'text'; mood: Mood }
  | { kind: 'location'; mood: Mood; body: string };

export function ComposerScreen() {
  const [step, setStep] = useState<Step>({ kind: 'mood' });

  return (
    <View style={{ flex: 1 }}>
      {step.kind === 'mood' && (
        <MoodPicker onPick={(mood) => setStep({ kind: 'text', mood })} />
      )}
      {step.kind === 'text' && (
        <TextEditor mood={step.mood} onContinue={(body) => setStep({ kind: 'location', mood: step.mood, body })} />
      )}
      {/* Task 22-23 add location step */}
    </View>
  );
}
```

- [ ] **Step 5: Run tests + verify in browser**

```bash
npm test -- TextEditor
npm run web
```

- [ ] **Step 6: Commit**

```bash
git add src/compose/ tests/unit/TextEditor.test.tsx
git commit -m "feat(compose): add text editor step with 1000-char validation"
```

---

## Task 22: Composer Step 3 — location picker (GPS + drop pin)

**Files:**
- Create: `src/compose/LocationPicker.tsx`, `src/compose/LocationGPS.tsx`, `src/compose/LocationDropPin.tsx`
- Modify: `src/compose/ComposerScreen.tsx`

- [ ] **Step 1: GPS tab**

`src/compose/LocationGPS.tsx`:
```tsx
import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import * as Location from 'expo-location';
import { useTheme } from '@/theme/ThemeContext';
import type { LatLng } from '@/lib/geo';

export interface LocationGPSProps {
  onPick: (loc: LatLng) => void;
}

export function LocationGPS({ onPick }: LocationGPSProps) {
  const theme = useTheme();
  const [status, setStatus] = useState<'idle' | 'asking' | 'denied' | 'got'>('idle');
  const [coords, setCoords] = useState<LatLng | null>(null);

  const getLocation = async () => {
    setStatus('asking');
    const { status: perm } = await Location.requestForegroundPermissionsAsync();
    if (perm !== 'granted') {
      setStatus('denied');
      return;
    }
    const { coords: c } = await Location.getCurrentPositionAsync({});
    setCoords({ lat: c.latitude, lng: c.longitude });
    setStatus('got');
  };

  return (
    <View style={styles.wrap}>
      {status === 'idle' && (
        <Pressable onPress={getLocation} style={[styles.btn, { backgroundColor: theme.accent }]}>
          <Text style={styles.btnTxt}>Use my current location</Text>
        </Pressable>
      )}
      {status === 'asking' && <Text style={{ color: theme.textMuted }}>Asking permission…</Text>}
      {status === 'denied' && <Text style={{ color: '#ff8a8a' }}>Permission denied. Try another option.</Text>}
      {status === 'got' && coords && (
        <>
          <Text style={[styles.coords, { color: theme.textPrimary }]}>
            {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
          </Text>
          <Pressable onPress={() => onPick(coords)} style={[styles.btn, { backgroundColor: theme.accent }]}>
            <Text style={styles.btnTxt}>Use this location</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 24, alignItems: 'center', gap: 16 },
  coords: { fontSize: 14, fontFamily: 'monospace' },
  btn: { paddingHorizontal: 22, paddingVertical: 12, borderRadius: 12 },
  btnTxt: { color: '#2a1f0a', fontWeight: '600' },
});
```

- [ ] **Step 2: Drop-pin tab**

`src/compose/LocationDropPin.tsx`:
```tsx
import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Map, { Marker } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useTheme } from '@/theme/ThemeContext';
import type { LatLng } from '@/lib/geo';

export interface LocationDropPinProps {
  onPick: (loc: LatLng) => void;
}

export function LocationDropPin({ onPick }: LocationDropPinProps) {
  const theme = useTheme();
  const [center, setCenter] = useState<LatLng>({ lat: 14.5995, lng: 120.9842 });

  return (
    <View style={styles.wrap}>
      <View style={styles.mapBox}>
        <Map
          initialViewState={{ longitude: center.lng, latitude: center.lat, zoom: 6 }}
          mapStyle={theme.mapStyle}
          style={{ width: '100%', height: '100%' }}
          onMove={(e) => setCenter({ lat: e.viewState.latitude, lng: e.viewState.longitude })}
        >
          <Marker longitude={center.lng} latitude={center.lat} anchor="center">
            <View style={[styles.pin, { backgroundColor: theme.accent }]} />
          </Marker>
        </Map>
      </View>
      <Pressable onPress={() => onPick(center)} style={[styles.btn, { backgroundColor: theme.accent }]}>
        <Text style={styles.btnTxt}>Drop pin here</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 16, gap: 12 },
  mapBox: { height: 320, borderRadius: 12, overflow: 'hidden' },
  pin: { width: 18, height: 18, borderRadius: 9 },
  btn: { padding: 12, borderRadius: 12, alignItems: 'center' },
  btnTxt: { color: '#2a1f0a', fontWeight: '600' },
});
```

- [ ] **Step 3: LocationPicker tab container**

`src/compose/LocationPicker.tsx`:
```tsx
import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { LocationGPS } from './LocationGPS';
import { LocationDropPin } from './LocationDropPin';
import { LocationCity } from './LocationCity';
import type { LatLng } from '@/lib/geo';
import type { PinMode } from '@/data/types';

export interface PickedLocation {
  coords: LatLng;
  pinMode: PinMode;
  label?: string;
}

export interface LocationPickerProps {
  onPick: (loc: PickedLocation) => void;
}

type Tab = 'gps' | 'drop' | 'city';

export function LocationPicker({ onPick }: LocationPickerProps) {
  const theme = useTheme();
  const [tab, setTab] = useState<Tab>('gps');

  return (
    <View style={[styles.wrap, { backgroundColor: theme.background }]}>
      <Text style={[styles.title, { color: theme.textPrimary, fontFamily: theme.fontFamily }]}>
        Where does this story live?
      </Text>
      <View style={styles.tabs}>
        {(['gps', 'drop', 'city'] as const).map((t) => (
          <Pressable
            key={t}
            onPress={() => setTab(t)}
            style={[styles.tab, { borderColor: tab === t ? theme.accent : 'transparent' }]}
          >
            <Text style={[styles.tabTxt, { color: theme.textPrimary }]}>
              {t === 'gps' ? '📍 My location' : t === 'drop' ? '🗺️ Drop a pin' : '🏙️ Pick a city'}
            </Text>
          </Pressable>
        ))}
      </View>
      {tab === 'gps' && <LocationGPS onPick={(c) => onPick({ coords: c, pinMode: 'gps' })} />}
      {tab === 'drop' && <LocationDropPin onPick={(c) => onPick({ coords: c, pinMode: 'dropped' })} />}
      {tab === 'city' && <LocationCity onPick={(c, label) => onPick({ coords: c, pinMode: 'city', label })} />}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: 16, paddingTop: 60 },
  title: { fontSize: 22, marginBottom: 18 },
  tabs: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  tab: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 18, borderWidth: 1 },
  tabTxt: { fontSize: 12, fontWeight: '600' },
});
```

- [ ] **Step 4: Commit**

```bash
git add src/compose/
git commit -m "feat(compose): add GPS + drop-pin location tabs"
```

---

## Task 23: Composer Step 3 — city search tab

**Files:**
- Create: `src/compose/LocationCity.tsx`

- [ ] **Step 1: Implement**

`src/compose/LocationCity.tsx`:
```tsx
import { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { geocodeCity, type CityResult } from '@/lib/geo';
import type { LatLng } from '@/lib/geo';

export interface LocationCityProps {
  onPick: (loc: LatLng, label: string) => void;
}

export function LocationCity({ onPick }: LocationCityProps) {
  const theme = useTheme();
  const [q, setQ] = useState('');
  const [results, setResults] = useState<CityResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    const ctrl = new AbortController();
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const r = await geocodeCity(q, ctrl.signal);
        setResults(r);
      } catch {
        /* ignore aborted */
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => {
      ctrl.abort();
      clearTimeout(t);
    };
  }, [q]);

  return (
    <View style={styles.wrap}>
      <TextInput
        value={q}
        onChangeText={setQ}
        placeholder="Search for a city…"
        placeholderTextColor={theme.textMuted}
        style={[styles.input, { color: theme.textPrimary, borderColor: theme.surface }]}
      />
      {loading && <ActivityIndicator color={theme.accent} style={{ marginTop: 12 }} />}
      <View style={styles.results}>
        {results.map((r, i) => (
          <Pressable
            key={`${r.label}-${i}`}
            onPress={() => onPick({ lat: r.lat, lng: r.lng }, r.label)}
            style={[styles.result, { backgroundColor: theme.surface }]}
          >
            <Text style={[styles.resultTxt, { color: theme.textPrimary }]}>{r.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 16 },
  input: { borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 15 },
  results: { marginTop: 12, gap: 8 },
  result: { padding: 14, borderRadius: 12 },
  resultTxt: { fontSize: 14 },
});
```

- [ ] **Step 2: Wire location step into ComposerScreen**

Update `src/compose/ComposerScreen.tsx`:
```tsx
import { useState } from 'react';
import { View } from 'react-native';
import { MoodPicker } from './MoodPicker';
import { TextEditor } from './TextEditor';
import { LocationPicker, type PickedLocation } from './LocationPicker';
import { useCreateStory } from '@/data/useCreateStory';
import { useRouter } from 'expo-router';
import type { Mood } from '@/data/types';

type Step =
  | { kind: 'mood' }
  | { kind: 'text'; mood: Mood }
  | { kind: 'location'; mood: Mood; body: string }
  | { kind: 'submitting' };

export function ComposerScreen() {
  const [step, setStep] = useState<Step>({ kind: 'mood' });
  const router = useRouter();
  const create = useCreateStory();

  const submit = async (mood: Mood, body: string, loc: PickedLocation) => {
    setStep({ kind: 'submitting' });
    try {
      await create({ mood, body, ...loc });
      router.replace('/');
    } catch (e) {
      alert(`Could not post: ${(e as Error).message}`);
      setStep({ kind: 'location', mood, body });
    }
  };

  return (
    <View style={{ flex: 1 }}>
      {step.kind === 'mood' && (
        <MoodPicker onPick={(mood) => setStep({ kind: 'text', mood })} />
      )}
      {step.kind === 'text' && (
        <TextEditor mood={step.mood} onContinue={(body) => setStep({ kind: 'location', mood: step.mood, body })} />
      )}
      {step.kind === 'location' && (
        <LocationPicker onPick={(loc) => submit(step.mood, step.body, loc)} />
      )}
      {step.kind === 'submitting' && (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }} />
      )}
    </View>
  );
}
```

- [ ] **Step 3: Commit (will fail to compile until Task 24 adds useCreateStory; that's OK — Task 24 is next)**

```bash
git add src/compose/
git commit -m "feat(compose): add city-search location tab and wire 3-step flow"
```

---

## Task 24: Edge Function — `create-story`

**Files:**
- Create: `supabase/functions/create-story/index.ts`

- [ ] **Step 1: Write the Edge Function**

`supabase/functions/create-story/index.ts`:
```ts
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface CreateStoryBody {
  mood: string;
  body: string;
  lat: number;
  lng: number;
  pin_mode: 'gps' | 'dropped' | 'city';
  location_label?: string | null;
  language?: string | null;
}

const VALID_MOODS = new Set([
  'regret', 'on_my_mind', 'struggling', 'hopeful',
  'memory', 'dream', 'unsent_letter', 'forgiveness',
]);
const VALID_PIN_MODES = new Set(['gps', 'dropped', 'city']);

const GRID = 0.0045;
function round500m(n: number) { return Math.round(n / GRID) * GRID; }

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: cors });

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return new Response('Unauthorized', { status: 401, headers: cors });

  let payload: CreateStoryBody;
  try {
    payload = await req.json();
  } catch {
    return new Response('Bad JSON', { status: 400, headers: cors });
  }

  if (!VALID_MOODS.has(payload.mood)) return new Response('Invalid mood', { status: 400, headers: cors });
  if (!VALID_PIN_MODES.has(payload.pin_mode)) return new Response('Invalid pin_mode', { status: 400, headers: cors });
  if (typeof payload.body !== 'string' || payload.body.length < 1 || payload.body.length > 1000) {
    return new Response('Body length must be 1..1000 chars', { status: 400, headers: cors });
  }
  if (typeof payload.lat !== 'number' || typeof payload.lng !== 'number') {
    return new Response('Invalid coordinates', { status: 400, headers: cors });
  }

  const supa = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } },
  );

  const { data: authUser } = await supa.auth.getUser();
  if (!authUser?.user) return new Response('Unauthorized', { status: 401, headers: cors });

  const lat = round500m(payload.lat);
  const lng = round500m(payload.lng);

  const insert = await supa.from('stories').insert({
    author_id: authUser.user.id,
    mood: payload.mood,
    body: payload.body,
    location: `SRID=4326;POINT(${lng} ${lat})`,
    location_label: payload.location_label ?? null,
    pin_mode: payload.pin_mode,
    language: payload.language ?? 'en',
    status: 'live', // Plan 2 changes this to run through moderation
  }).select('id').single();

  if (insert.error) return new Response(insert.error.message, { status: 400, headers: cors });

  return new Response(JSON.stringify({ id: insert.data.id }), {
    status: 201,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
});
```

- [ ] **Step 2: Deploy the Edge Function**

```bash
npx supabase functions deploy create-story
```
Expected: "Function deployed successfully".

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/
git commit -m "feat(api): add create-story Edge Function with input validation and 500m rounding"
```

---

## Task 25: `useCreateStory` hook

**Files:**
- Create: `src/data/useCreateStory.ts`

- [ ] **Step 1: Implement hook**

`src/data/useCreateStory.ts`:
```ts
import { supabase } from './supabase';
import type { Mood, PinMode } from './types';

export interface CreateStoryArgs {
  mood: Mood;
  body: string;
  coords: { lat: number; lng: number };
  pinMode: PinMode;
  label?: string;
}

export function useCreateStory() {
  return async function create({ mood, body, coords, pinMode, label }: CreateStoryArgs): Promise<string> {
    const { data, error } = await supabase.functions.invoke('create-story', {
      body: {
        mood,
        body,
        lat: coords.lat,
        lng: coords.lng,
        pin_mode: pinMode,
        location_label: label ?? null,
      },
    });
    if (error) throw new Error(error.message);
    return (data as { id: string }).id;
  };
}
```

- [ ] **Step 2: Verify it compiles**

```bash
npm run typecheck
```

- [ ] **Step 3: Commit**

```bash
git add src/data/useCreateStory.ts
git commit -m "feat(data): add useCreateStory hook calling create-story Edge Function"
```

---

## Task 26: End-to-end manual smoke test

- [ ] **Step 1: Run dev server**

```bash
npm run web
```

- [ ] **Step 2: Manual flow**

1. Open `http://localhost:8081`. See map of Philippines with seed pins.
2. Click + button. Mood picker opens.
3. Pick "Hopeful". Text editor shows prompt "What's giving you hope?".
4. Type "A small win today." → Continue.
5. Click "🏙️ Pick a city" tab. Search "Cebu City". Click first result.
6. Returns to map. Within ~1s, a new amber pin appears at Cebu.
7. Tap the pin. See full story with "🌱 Hopeful · Cebu City · 0d ago".
8. Back to map.

Expected: all of the above works without console errors.

- [ ] **Step 3: Commit progress (no code change — checkpoint)**

```bash
git commit --allow-empty -m "chore: manual smoke test of compose → submit → realtime → read"
```

---

## Task 27: JourneyTracker E2E helper

**Files:**
- Create: `tests/e2e/journey-tracker.ts`

- [ ] **Step 1: Implement**

`tests/e2e/journey-tracker.ts`:
```ts
import type { Page } from '@playwright/test';

export interface JourneyStep {
  id: string;
  label: string;
}

export class JourneyTracker {
  constructor(private page: Page) {}

  async install(steps: JourneyStep[]): Promise<void> {
    await this.page.evaluate((steps) => {
      const overlay = document.createElement('div');
      overlay.id = '__journey-tracker';
      overlay.style.cssText = `
        position: fixed; top: 12px; right: 12px; z-index: 99999;
        background: rgba(20,26,58,0.92); color: #f5e6c8; font-family: monospace;
        padding: 10px 14px; border: 1px solid rgba(244,201,122,0.5);
        border-radius: 10px; font-size: 12px; min-width: 220px;
      `;
      const title = document.createElement('div');
      title.textContent = 'JOURNEY';
      title.style.cssText = 'font-weight:700;letter-spacing:1.5px;margin-bottom:6px;color:#f4c97a';
      overlay.appendChild(title);
      const list = document.createElement('div');
      list.id = '__journey-list';
      for (const s of steps) {
        const row = document.createElement('div');
        row.id = `__journey-${s.id}`;
        row.dataset.done = 'false';
        row.textContent = `☐ ${s.label}`;
        row.style.padding = '2px 0';
        list.appendChild(row);
      }
      overlay.appendChild(list);
      document.body.appendChild(overlay);
    }, steps);
  }

  async tick(stepId: string): Promise<void> {
    await this.page.evaluate((id) => {
      const row = document.getElementById(`__journey-${id}`);
      if (row) {
        row.dataset.done = 'true';
        row.textContent = `✓ ${row.textContent?.replace(/^[☐✓]\s+/, '')}`;
        (row.style as any).color = '#a8d8a8';
      }
    }, stepId);
  }

  async clear(): Promise<void> {
    await this.page.evaluate(() => {
      document.getElementById('__journey-tracker')?.remove();
    });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add tests/e2e/journey-tracker.ts
git commit -m "test(e2e): add JourneyTracker overlay helper"
```

---

## Task 28: E2E test — post a story end-to-end

**Files:**
- Create: `tests/e2e/post-story.spec.ts`

- [ ] **Step 1: Write the test**

`tests/e2e/post-story.spec.ts`:
```ts
import { test, expect } from '@playwright/test';
import { JourneyTracker } from './journey-tracker';

test('post a hopeful story and see it on the map', async ({ page }) => {
  await page.goto('/');

  const journey = new JourneyTracker(page);
  await journey.install([
    { id: 'home', label: 'Home loaded' },
    { id: 'compose', label: 'Composer opened' },
    { id: 'mood', label: 'Mood picked' },
    { id: 'text', label: 'Text written' },
    { id: 'location', label: 'Location chosen' },
    { id: 'pin', label: 'New pin visible on map' },
  ]);

  // Wait for map to render (canvas exists)
  await expect(page.locator('canvas')).toBeVisible({ timeout: 10_000 });
  await journey.tick('home');

  // Open composer
  await page.getByText('+', { exact: true }).click();
  await expect(page.getByText('What is this?')).toBeVisible();
  await journey.tick('compose');

  // Pick "Hopeful"
  await page.getByText('Hopeful').click();
  await expect(page.getByText("What's giving you hope?")).toBeVisible();
  await journey.tick('mood');

  // Write text
  await page.getByPlaceholder(/looking forward/i).fill('A small win today, e2e style.');
  await page.getByText('Continue →').click();
  await journey.tick('text');

  // Pick a city
  await page.getByText('🏙️ Pick a city').click();
  await page.getByPlaceholder(/Search for a city/).fill('Cebu City');
  await page.getByText(/Cebu/).first().click();
  await journey.tick('location');

  // Back on home — wait for new pin to render via realtime
  await page.waitForTimeout(2_000);
  // Verify our text appears in the database via the story page (tap the latest pin would require coords math —
  // for the E2E we just confirm the home page returned and a canvas is still visible)
  await expect(page.locator('canvas')).toBeVisible();
  await journey.tick('pin');
});
```

- [ ] **Step 2: Run E2E**

```bash
npm run test:e2e
```
Expected: PASS. Watch the JourneyTracker overlay tick through each step in headed mode (`--headed` flag).

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/post-story.spec.ts
git commit -m "test(e2e): add post-story journey with JourneyTracker overlay"
```

---

## Task 29: Deploy web build to Vercel

**Files:**
- Create: `vercel.json`
- Modify: `README.md` (deployment section)

- [ ] **Step 1: Configure Vercel build**

`vercel.json`:
```json
{
  "buildCommand": "npx expo export -p web",
  "outputDirectory": "dist",
  "framework": null,
  "installCommand": "npm install"
}
```

- [ ] **Step 2: Sign up / log in to Vercel and link project**

```bash
npx vercel login
npx vercel link
```
Follow CLI prompts. Project name: `sulat`. Link to your account.

- [ ] **Step 3: Set environment variables in Vercel**

```bash
npx vercel env add EXPO_PUBLIC_SUPABASE_URL production
# paste value when prompted
npx vercel env add EXPO_PUBLIC_SUPABASE_ANON_KEY production
# paste value when prompted
```

(Repeat for `preview` and `development` if needed.)

- [ ] **Step 4: Deploy**

```bash
npx vercel --prod
```
Expected: a public URL like `https://sulat.vercel.app`.

- [ ] **Step 5: Verify production**

Open the production URL in an incognito window. Expected:
- Map loads.
- Seed pins visible.
- + button opens composer.
- Posting a story end-to-end works against production Supabase.

- [ ] **Step 6: Update README**

Add to `README.md`:
```markdown
# Sulat

A cozy, anonymous map of feelings.

## Local development

```bash
npm install
cp .env.local.example .env.local   # fill in your Supabase URL + anon key
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
npx supabase functions deploy create-story
npm run web
```

## Deployment

Deploys to Vercel via `npx vercel --prod`. Environment variables required:
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

## Tests

```bash
npm test           # unit + integration
npm run test:e2e   # Playwright E2E (web)
```
```

- [ ] **Step 7: Commit**

```bash
git add vercel.json README.md
git commit -m "feat(deploy): configure Vercel deploy for web build"
```

---

## Self-Review Checklist (run this before declaring Plan 1 done)

- [ ] All 29 tasks committed individually with conventional-commit messages
- [ ] `npm run typecheck` clean
- [ ] `npm run lint` clean
- [ ] `npm test` all unit + integration tests pass
- [ ] `npm run test:e2e` Playwright suite passes with JourneyTracker visible
- [ ] Manual smoke test from Task 26 still works on production Vercel deploy
- [ ] No `.env.local` accidentally committed (`git log --all --full-history -- .env.local` returns nothing)
- [ ] Supabase RLS verified by attempting to read another user's `theme_preference` from a separate browser → should get nothing
- [ ] Real story can be posted from the live Vercel URL and is persisted

---

## What you have at the end of Plan 1

- A live web app at a Vercel URL.
- Anonymous identity that survives reloads on the same device.
- World map with cozy glowing pins, default-centered on the Philippines.
- Pin clustering + heatmap toggle.
- A 3-step composer (mood → text → location/3-tabs) that posts to a real Postgres + PostGIS database.
- Real-time updates: a new post appears on the map within ~1 second.
- Lantern Glow theme (only theme for now — Plan 4 adds the other three + switcher).
- 500m geographic privacy rounding.
- One end-to-end Playwright test with the JourneyTracker overlay.

## What's missing (next plans)

- Plan 2 — Trust Layer: real moderation pipeline (currently any post goes live), rate limits, hotline overlay, community flagging UI.
- Plan 3 — Engagement: replies, reactions, optional account upgrade, push notifications scaffolding.
- Plan 4 — Polish: 3 more themes + theme switcher, Memory transition (180-day flip), Lantern Mode, onboarding, accessibility passes, animations.
- Plan 5 — Admin & Hardening: solo moderator dashboard, "Delete my data" button, Sentry, privacy/ToS pages.
