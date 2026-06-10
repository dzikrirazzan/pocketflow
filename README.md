# PocketFlow

PocketFlow is a multi-wallet finance tracker built with Expo React Native, Next.js web/API routes, Supabase PostgreSQL/Auth, and Drizzle ORM.

Live Web + API: https://pocketflow-seven.vercel.app
GitHub: https://github.com/dzikrirazzan/pocketflow

## Apps

- `apps/mobile`: Expo app for iOS via Expo Go.
- `apps/api`: Next.js web frontend and API backend deployed together to Vercel.

## Core Features

- Supabase Auth-ready login flow.
- Multiple wallets with balances.
- Income, expense, and wallet transfer transactions.
- Categories for spending reports.
- Daily, weekly, and monthly budgets.
- Spending recap by day, week, month, category, wallet, and budget.

## Environment

Copy the example env files and fill them with your Supabase project values.

```bash
cp apps/api/.env.example apps/api/.env.local
cp apps/mobile/.env.example apps/mobile/.env
```

## Database

Run the SQL in `apps/api/db/schema.sql` inside Supabase SQL Editor.

Required Supabase settings:

- Enable Email Auth in Supabase Auth.
- Copy the project URL and anon key into both app env files.
- Copy the PostgreSQL connection string into `apps/api/.env.local` and Vercel environment variables.

## Production Setup

PocketFlow production uses:

- Vercel for the web frontend and backend API.
- Supabase for Auth and Postgres database.
- Expo Go for the iOS mobile client.

The same Supabase user can sign in on web and mobile. Both clients call the same Vercel API using the Supabase bearer token, so data stays synced by `user.id`.

## Deploy Web + Backend To Vercel

The repo includes `vercel.json`, so deploy from the repository root.

1. Create a free Supabase project and run `apps/api/db/schema.sql`.
2. Add these Vercel production environment variables:

```bash
DATABASE_URL=postgresql://...
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
```

3. Deploy production:

```bash
npm run deploy:vercel
```

The Vercel URL serves both:

- Web app: `https://your-vercel-domain`
- API routes: `https://your-vercel-domain/api/...`

## Expo Go

Create `apps/mobile/.env` from `apps/mobile/.env.example`, then set:

```bash
EXPO_PUBLIC_API_URL=https://your-vercel-domain
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_DEMO_MODE=false
```

Run:

```bash
npm run dev:mobile
```

Scan the QR code with Expo Go on iPhone. Keep the terminal running while using Expo Go.

## Local Development

```bash
npm install
npm run dev:api
npm run dev:mobile
```

For local API testing, set `EXPO_PUBLIC_API_URL` in `apps/mobile/.env` to your local API URL. On a physical iPhone, do not use `localhost`; use your Mac LAN IP, for example `http://192.168.1.158:3000`.

## Final Checks

```bash
npm run verify
```

This checks TypeScript, builds the Vercel web/API app, and verifies Expo SDK package compatibility.
