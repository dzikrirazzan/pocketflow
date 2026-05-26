# PocketFlow

PocketFlow is a multi-wallet finance tracker built with Expo React Native, Next.js API routes, Supabase PostgreSQL/Auth, and Drizzle ORM.

## Apps

- `apps/mobile`: Expo app for iOS via Expo Go.
- `apps/api`: Next.js API backend deployable to Vercel.

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

## Deploy Backend Free

1. Push this repository to GitHub.
2. Create a free Supabase project and run `apps/api/db/schema.sql`.
3. Import the GitHub repository into Vercel.
4. Set the Vercel project root to `apps/api` or keep the root repo config and use the included `vercel.json`.
5. Add these Vercel environment variables:

```bash
DATABASE_URL=postgresql://...
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
```

6. After Vercel deploys, set `EXPO_PUBLIC_API_URL` in `apps/mobile/.env` to the Vercel URL.

## Expo Go

Run `npm run dev:mobile`, scan the QR code with Expo Go on iPhone, and keep the API URL reachable from the phone. For local device testing, use your Mac LAN IP instead of `localhost`.

## Local Development

```bash
npm install
npm run dev:api
npm run dev:mobile
```

Set `EXPO_PUBLIC_API_URL` in `apps/mobile/.env` to your local API URL, usually `http://localhost:3000`.

The mobile app starts in demo mode by default, so it can be opened in Expo Go before Supabase is configured. Set `EXPO_PUBLIC_DEMO_MODE="false"` when you want real auth and database sync.
