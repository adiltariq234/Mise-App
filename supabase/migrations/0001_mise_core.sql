-- Mise — core tables (login + database, 2026-11-16)
--
-- HOW TO APPLY (one time, by Adil — the app never runs this itself):
--   Supabase dashboard → project "mise" → SQL Editor → paste this file
--   → Run. Or: `supabase db push` from a linked local project.
-- After applying, sign-in works and the app saves a signed-in user's
-- data here; guests keep using localStorage exactly as before.
--
-- Every table is owned by its user: row-level security is ON and each
-- policy only allows rows where user_id (or id) = auth.uid(). The
-- service-role key (server-only) bypasses RLS; the browser anon key
-- never can.

-- Keep updated_at fresh without app code having to set it.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------- profiles
-- One row per account. `is_pro` is the future Pro toggle (admin panel
-- flips it; the app does not use it yet — everyone is free for now).
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  is_pro boolean not null default false,
  active_fridge_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Users manage their own profile" on public.profiles;
create policy "Users manage their own profile"
  on public.profiles
  for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------- fridge_profiles
-- One row per named fridge; the whole ingredient list is one JSONB
-- column (mirrors the local FridgeProfile shape 1:1).
create table if not exists public.fridge_profiles (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  ingredients jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.fridge_profiles enable row level security;

drop policy if exists "Users manage their own fridges" on public.fridge_profiles;
create policy "Users manage their own fridges"
  on public.fridge_profiles
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists fridge_profiles_user_id_idx
  on public.fridge_profiles (user_id);

-- --------------------------------------------------------------------- scans
-- One row per fridge scan (detected ingredients + generated recipes).
-- `lastScan` is simply the newest row; scan history is the newest 5.
create table if not exists public.scans (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  scanned_at bigint not null,
  summary text not null default '',
  ingredients jsonb not null default '[]'::jsonb,
  recipes jsonb not null default '[]'::jsonb,
  thumbnail text
);

alter table public.scans enable row level security;

drop policy if exists "Users manage their own scans" on public.scans;
create policy "Users manage their own scans"
  on public.scans
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists scans_user_id_scanned_at_idx
  on public.scans (user_id, scanned_at desc);

-- ----------------------------------------------------------------- favorites
-- Favourite recipe ids (the recipe itself lives inside a scan row).
create table if not exists public.favorites (
  user_id uuid not null references auth.users (id) on delete cascade,
  recipe_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, recipe_id)
);

alter table public.favorites enable row level security;

drop policy if exists "Users manage their own favorites" on public.favorites;
create policy "Users manage their own favorites"
  on public.favorites
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ------------------------------------------------------------ shopping_items
create table if not exists public.shopping_items (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  amount text not null default '',
  category text,
  source_recipe text,
  checked boolean not null default false,
  added_at bigint not null
);

alter table public.shopping_items enable row level security;

drop policy if exists "Users manage their own shopping items" on public.shopping_items;
create policy "Users manage their own shopping items"
  on public.shopping_items
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists shopping_items_user_id_idx
  on public.shopping_items (user_id);

-- ----------------------------------------------------------------- meal_plans
-- One row per user; the whole week plan is one JSONB column.
create table if not exists public.meal_plans (
  user_id uuid primary key references auth.users (id) on delete cascade,
  plan jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.meal_plans enable row level security;

drop policy if exists "Users manage their own meal plan" on public.meal_plans;
create policy "Users manage their own meal plan"
  on public.meal_plans
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop trigger if exists meal_plans_set_updated_at on public.meal_plans;
create trigger meal_plans_set_updated_at
  before update on public.meal_plans
  for each row execute function public.set_updated_at();
