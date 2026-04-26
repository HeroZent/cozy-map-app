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

Deploys to Vercel via `npx vercel --prod`. One-time setup:

```bash
npx vercel login
npx vercel link                             # project name: sulat
npx vercel env add EXPO_PUBLIC_SUPABASE_URL production
npx vercel env add EXPO_PUBLIC_SUPABASE_ANON_KEY production
npx vercel --prod
```

Environment variables required:
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

## Tests

```bash
npm test           # unit + integration
npm run test:e2e   # Playwright E2E (web)
```
