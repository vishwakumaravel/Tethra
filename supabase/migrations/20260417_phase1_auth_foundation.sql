create extension if not exists "pgcrypto";

do $$
begin
  if not exists (select 1 from pg_type where typname = 'partner_status') then
    create type public.partner_status as enum ('unlinked', 'invited', 'linked');
  end if;

  if not exists (select 1 from pg_type where typname = 'couple_status') then
    create type public.couple_status as enum ('pending', 'linked');
  end if;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  phone text,
  display_name text,
  avatar_url text,
  partner_status public.partner_status not null default 'unlinked',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.couples (
  id uuid primary key default gen_random_uuid(),
  user_1_id uuid references public.profiles (id) on delete set null,
  user_2_id uuid references public.profiles (id) on delete set null,
  invite_code text unique,
  status public.couple_status not null default 'pending',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create or replace function public.set_current_timestamp_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_current_timestamp_updated_at();

drop trigger if exists set_couples_updated_at on public.couples;
create trigger set_couples_updated_at
before update on public.couples
for each row execute function public.set_current_timestamp_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, phone)
  values (new.id, new.email, new.phone)
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.couples enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles
for insert
with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "couples_select_participant" on public.couples;
create policy "couples_select_participant"
on public.couples
for select
using (auth.uid() = user_1_id or auth.uid() = user_2_id);

drop policy if exists "couples_insert_participant" on public.couples;
create policy "couples_insert_participant"
on public.couples
for insert
with check (auth.uid() = user_1_id or auth.uid() = user_2_id);

drop policy if exists "couples_update_participant" on public.couples;
create policy "couples_update_participant"
on public.couples
for update
using (auth.uid() = user_1_id or auth.uid() = user_2_id)
with check (auth.uid() = user_1_id or auth.uid() = user_2_id);
