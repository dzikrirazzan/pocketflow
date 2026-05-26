create type transaction_type as enum ('income', 'expense', 'transfer');
create type budget_period as enum ('daily', 'weekly', 'monthly');

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text,
  created_at timestamptz not null default now()
);

create table wallets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  type text not null default 'cash',
  currency text not null default 'IDR',
  balance numeric(14, 2) not null default 0,
  color text not null default '#2563eb',
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  icon text not null default 'tag',
  color text not null default '#64748b',
  kind text not null default 'expense',
  created_at timestamptz not null default now()
);

create table budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  category_id uuid references categories(id) on delete set null,
  name text not null,
  amount numeric(14, 2) not null,
  period budget_period not null default 'monthly',
  starts_on date not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  wallet_id uuid references wallets(id) on delete set null,
  target_wallet_id uuid references wallets(id) on delete set null,
  category_id uuid references categories(id) on delete set null,
  budget_id uuid references budgets(id) on delete set null,
  type transaction_type not null,
  amount numeric(14, 2) not null,
  note text,
  happened_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table recurring_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  wallet_id uuid references wallets(id) on delete set null,
  category_id uuid references categories(id) on delete set null,
  budget_id uuid references budgets(id) on delete set null,
  type transaction_type not null,
  amount numeric(14, 2) not null,
  note text,
  cadence budget_period not null,
  next_run_on date not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index wallets_user_idx on wallets(user_id);
create index categories_user_idx on categories(user_id);
create index budgets_user_idx on budgets(user_id);
create index transactions_user_date_idx on transactions(user_id, happened_at);
create index transactions_wallet_idx on transactions(wallet_id);
create index transactions_budget_idx on transactions(budget_id);
create index recurring_transactions_user_idx on recurring_transactions(user_id);

alter table profiles enable row level security;
alter table wallets enable row level security;
alter table categories enable row level security;
alter table budgets enable row level security;
alter table transactions enable row level security;
alter table recurring_transactions enable row level security;

create policy "profiles owner access" on profiles using (auth.uid() = id) with check (auth.uid() = id);
create policy "wallets owner access" on wallets using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "categories owner access" on categories using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "budgets owner access" on budgets using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "transactions owner access" on transactions using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "recurring owner access" on recurring_transactions using (auth.uid() = user_id) with check (auth.uid() = user_id);
