create table if not exists public.invite_code_audit (
  code text primary key,
  couple_id uuid references public.couples (id) on delete cascade,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  invalidated_reason text not null check (invalidated_reason in ('expired', 'removed', 'reused')),
  invalidated_at timestamptz not null default timezone('utc', now())
);

alter table public.profiles
add column if not exists current_couple_id uuid references public.couples (id) on delete set null;

alter table public.couples
add column if not exists timezone text not null default 'UTC';

alter table public.couples
add column if not exists invite_code text;

alter table public.couples
add column if not exists invite_expires_at timestamptz;

alter table public.couples
add column if not exists linked_at timestamptz;

create index if not exists idx_profiles_current_couple_id on public.profiles (current_couple_id);
create index if not exists idx_couples_participants on public.couples (user_1_id, user_2_id);
create unique index if not exists idx_couples_active_pending_inviter
on public.couples (user_1_id)
where status = 'pending';

create unique index if not exists idx_couples_active_pending_code
on public.couples (invite_code)
where status = 'pending' and invite_code is not null;

alter table public.couples
drop constraint if exists couples_invite_code_format;

alter table public.couples
add constraint couples_invite_code_format
check (invite_code is null or invite_code ~ '^[A-Z0-9]{6}$');

create or replace function public.normalize_tethra_timezone(requested_timezone text)
returns text
language plpgsql
stable
as $$
begin
  if requested_timezone is null or btrim(requested_timezone) = '' then
    return 'UTC';
  end if;

  if exists (select 1 from pg_timezone_names where name = requested_timezone) then
    return requested_timezone;
  end if;

  return 'UTC';
end;
$$;

create or replace function public.generate_tethra_invite_code()
returns text
language plpgsql
as $$
declare
  alphabet constant text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  candidate text;
  i integer;
begin
  loop
    candidate := '';

    for i in 1..6 loop
      candidate := candidate || substr(alphabet, 1 + floor(random() * length(alphabet))::integer, 1);
    end loop;

    exit when not exists (
      select 1
      from public.couples
      where invite_code = candidate
        and status = 'pending'
        and invite_code is not null
    ) and not exists (
      select 1
      from public.invite_code_audit
      where code = candidate
    );
  end loop;

  return candidate;
end;
$$;

create or replace function public.create_couple_invite(
  regenerate boolean default false,
  requested_timezone text default 'UTC'
)
returns table (
  ok boolean,
  error_code text,
  error_message text,
  couple_id uuid,
  status text,
  invite_code text,
  invite_expires_at timestamptz,
  timezone text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  viewer_id uuid := auth.uid();
  normalized_timezone text := public.normalize_tethra_timezone(requested_timezone);
  existing_pending public.couples%rowtype;
  linked_couple_id uuid;
  next_code text;
begin
  if viewer_id is null then
    return query select false, 'unknown', 'You need to be signed in first.', null::uuid, null::text, null::text, null::timestamptz, null::text;
    return;
  end if;

  select p.current_couple_id
  into linked_couple_id
  from public.profiles p
  where p.id = viewer_id;

  if linked_couple_id is not null then
    return query select false, 'already_linked', 'You are already linked with a partner.', linked_couple_id, 'linked', null::text, null::timestamptz, null::text;
    return;
  end if;

  select *
  into existing_pending
  from public.couples
  where user_1_id = viewer_id
    and status = 'pending'
  limit 1
  for update;

  next_code := public.generate_tethra_invite_code();

  if found then
    if existing_pending.invite_expires_at is not null and existing_pending.invite_expires_at <= timezone('utc', now()) then
      if existing_pending.invite_code is not null then
        insert into public.invite_code_audit (code, couple_id, owner_id, invalidated_reason)
        values (existing_pending.invite_code, existing_pending.id, viewer_id, 'expired')
        on conflict (code) do nothing;
      end if;
    elsif not regenerate then
      return query
      select true, 'invite_exists', 'You already have an active invite.', existing_pending.id, existing_pending.status::text, existing_pending.invite_code, existing_pending.invite_expires_at, existing_pending.timezone;
      return;
    else
      if existing_pending.invite_code is not null then
        insert into public.invite_code_audit (code, couple_id, owner_id, invalidated_reason)
        values (existing_pending.invite_code, existing_pending.id, viewer_id, 'removed')
        on conflict (code) do nothing;
      end if;
    end if;

    update public.couples
    set invite_code = next_code,
        invite_expires_at = timezone('utc', now()) + interval '24 hours',
        timezone = normalized_timezone,
        updated_at = timezone('utc', now())
    where id = existing_pending.id;

    update public.profiles
    set partner_status = 'invited'
    where id = viewer_id;

    return query
    select true, null::text, null::text, existing_pending.id, 'pending', next_code, timezone('utc', now()) + interval '24 hours', normalized_timezone;
    return;
  end if;

  insert into public.couples (user_1_id, user_2_id, status, invite_code, invite_expires_at, timezone)
  values (viewer_id, null, 'pending', next_code, timezone('utc', now()) + interval '24 hours', normalized_timezone)
  returning id into linked_couple_id;

  update public.profiles
  set partner_status = 'invited'
  where id = viewer_id;

  return query
  select true, null::text, null::text, linked_couple_id, 'pending', next_code, timezone('utc', now()) + interval '24 hours', normalized_timezone;
end;
$$;

create or replace function public.join_couple_by_code(code text)
returns table (
  ok boolean,
  error_code text,
  error_message text,
  couple_id uuid,
  status text,
  invite_code text,
  invite_expires_at timestamptz,
  timezone text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  viewer_id uuid := auth.uid();
  normalized_code text := upper(trim(code));
  target_couple public.couples%rowtype;
  viewer_profile public.profiles%rowtype;
  partner_id uuid;
  audit_reason text;
begin
  if viewer_id is null then
    return query select false, 'unknown', 'You need to be signed in first.', null::uuid, null::text, null::text, null::timestamptz, null::text;
    return;
  end if;

  if normalized_code !~ '^[A-Z0-9]{6}$' then
    return query select false, 'invalid_code', 'That invite code does not look right.', null::uuid, null::text, null::text, null::timestamptz, null::text;
    return;
  end if;

  select *
  into viewer_profile
  from public.profiles
  where id = viewer_id
  for update;

  if viewer_profile.current_couple_id is not null then
    return query select false, 'already_linked', 'You are already linked with a partner.', viewer_profile.current_couple_id, 'linked', null::text, null::timestamptz, null::text;
    return;
  end if;

  if exists (
    select 1
    from public.couples
    where user_1_id = viewer_id
      and status = 'pending'
  ) then
    return query select false, 'invite_exists', 'Cancel your current invite before joining another one.', null::uuid, 'pending', null::text, null::timestamptz, null::text;
    return;
  end if;

  select *
  into target_couple
  from public.couples
  where invite_code = normalized_code
    and status = 'pending'
  limit 1
  for update;

  if found then
    if target_couple.user_1_id = viewer_id then
      return query select false, 'self_join', 'You cannot join your own invite code.', target_couple.id, target_couple.status::text, target_couple.invite_code, target_couple.invite_expires_at, target_couple.timezone;
      return;
    end if;

    if target_couple.invite_expires_at is not null and target_couple.invite_expires_at <= timezone('utc', now()) then
      if target_couple.invite_code is not null then
        insert into public.invite_code_audit (code, couple_id, owner_id, invalidated_reason)
        values (target_couple.invite_code, target_couple.id, target_couple.user_1_id, 'expired')
        on conflict (code) do nothing;
      end if;

      update public.couples
      set invite_code = null,
          invite_expires_at = null,
          updated_at = timezone('utc', now())
      where id = target_couple.id;

      update public.profiles
      set partner_status = 'unlinked'
      where id = target_couple.user_1_id;

      return query select false, 'expired_code', 'That invite code has expired. Ask your partner for a new one.', target_couple.id, 'pending', null::text, null::timestamptz, target_couple.timezone;
      return;
    end if;

    insert into public.invite_code_audit (code, couple_id, owner_id, invalidated_reason)
    values (normalized_code, target_couple.id, target_couple.user_1_id, 'reused')
    on conflict (code) do nothing;

    update public.couples
    set user_2_id = viewer_id,
        status = 'linked',
        linked_at = timezone('utc', now()),
        invite_code = null,
        invite_expires_at = null,
        updated_at = timezone('utc', now())
    where id = target_couple.id;

    update public.profiles
    set current_couple_id = target_couple.id,
        partner_status = 'linked'
    where id in (viewer_id, target_couple.user_1_id);

    return query select true, null::text, null::text, target_couple.id, 'linked', null::text, null::timestamptz, target_couple.timezone;
    return;
  end if;

  select invalidated_reason
  into audit_reason
  from public.invite_code_audit
  where code = normalized_code;

  if audit_reason is not null then
    return query
    select false,
      case audit_reason
        when 'expired' then 'expired_code'
        when 'removed' then 'removed_code'
        when 'reused' then 'reused_code'
        else 'invalid_code'
      end,
      case audit_reason
        when 'expired' then 'That invite code has expired. Ask your partner for a new one.'
        when 'removed' then 'That invite code is no longer active.'
        when 'reused' then 'That invite code has already been used.'
        else 'That invite code is not valid.'
      end,
      null::uuid,
      null::text,
      null::text,
      null::timestamptz,
      null::text;
    return;
  end if;

  return query select false, 'invalid_code', 'That invite code is not valid.', null::uuid, null::text, null::text, null::timestamptz, null::text;
end;
$$;

create or replace function public.cancel_pending_couple()
returns table (
  ok boolean,
  error_code text,
  error_message text,
  couple_id uuid,
  status text,
  invite_code text,
  invite_expires_at timestamptz,
  timezone text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  viewer_id uuid := auth.uid();
  pending_couple public.couples%rowtype;
begin
  if viewer_id is null then
    return query select false, 'unknown', 'You need to be signed in first.', null::uuid, null::text, null::text, null::timestamptz, null::text;
    return;
  end if;

  select *
  into pending_couple
  from public.couples
  where user_1_id = viewer_id
    and status = 'pending'
  limit 1
  for update;

  if not found then
    return query select false, 'unknown', 'There is no active invite to cancel.', null::uuid, null::text, null::text, null::timestamptz, null::text;
    return;
  end if;

  if pending_couple.invite_code is not null then
    insert into public.invite_code_audit (code, couple_id, owner_id, invalidated_reason)
    values (pending_couple.invite_code, pending_couple.id, viewer_id, 'removed')
    on conflict (code) do nothing;
  end if;

  delete from public.couples
  where id = pending_couple.id;

  update public.profiles
  set partner_status = 'unlinked'
  where id = viewer_id;

  return query select true, null::text, null::text, pending_couple.id, 'pending', null::text, null::timestamptz, pending_couple.timezone;
end;
$$;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
using (
  auth.uid() = id
  or exists (
    select 1
    from public.couples c
    where c.status = 'linked'
      and (
        (c.user_1_id = auth.uid() and c.user_2_id = profiles.id)
        or
        (c.user_2_id = auth.uid() and c.user_1_id = profiles.id)
      )
  )
);

grant execute on function public.create_couple_invite(boolean, text) to authenticated;
grant execute on function public.join_couple_by_code(text) to authenticated;
grant execute on function public.cancel_pending_couple() to authenticated;
