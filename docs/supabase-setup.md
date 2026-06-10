# Supabase Setup

Use the free Supabase plan for the first version.

## 1. Create Project

Create a new Supabase project, then copy:

- Project URL
- Anon public key
- PostgreSQL connection string

## 2. Create Tables

Open Supabase SQL Editor and run:

```sql
-- paste everything from apps/api/db/schema.sql
```

## 3. Configure Vercel Web + API

The Next.js app in `apps/api` serves both the web frontend and backend API. Add these environment variables in the Vercel project:

```bash
DATABASE_URL=postgresql://...
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
```

Redeploy the backend after saving env values.
Redeploy from the repository root:

```bash
npm run deploy:vercel
```

## 4. Configure Expo

Create `apps/mobile/.env`:

```bash
EXPO_PUBLIC_API_URL=https://pocketflow-seven.vercel.app
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_DEMO_MODE=false
```

For production Expo Go testing, keep `EXPO_PUBLIC_API_URL` pointed to Vercel. For local iPhone testing, replace local API URLs with your Mac LAN IP. Do not use `localhost` from the phone.
