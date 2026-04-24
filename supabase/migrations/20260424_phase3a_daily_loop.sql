alter table public.couples
add column if not exists current_streak integer not null default 0 check (current_streak >= 0);

alter table public.couples
add column if not exists longest_streak integer not null default 0 check (longest_streak >= 0);

alter table public.couples
add column if not exists last_paired_local_day date;

create table if not exists public.daily_check_ins (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  local_day date not null,
  mood_score integer not null check (mood_score between 1 and 5),
  relationship_feeling_score integer not null check (relationship_feeling_score between 1 and 5),
  stress_level integer not null check (stress_level between 1 and 5),
  optional_text text check (optional_text is null or char_length(optional_text) <= 280),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (couple_id, user_id, local_day)
);

create table if not exists public.daily_predictions (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  predictor_user_id uuid not null references public.profiles (id) on delete cascade,
  local_day date not null,
  predicted_mood_score integer not null check (predicted_mood_score between 1 and 5),
  predicted_relationship_feeling_score integer not null check (predicted_relationship_feeling_score between 1 and 5),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (couple_id, predictor_user_id, local_day)
);

create table if not exists public.daily_reveals (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  local_day date not null,
  revealed_at timestamptz not null default timezone('utc', now()),
  user_1_viewed_at timestamptz,
  user_2_viewed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  unique (couple_id, local_day)
);

create index if not exists idx_daily_check_ins_couple_day on public.daily_check_ins (couple_id, local_day);
create index if not exists idx_daily_predictions_couple_day on public.daily_predictions (couple_id, local_day);
create index if not exists idx_daily_reveals_couple_day on public.daily_reveals (couple_id, local_day);

drop trigger if exists set_daily_check_ins_updated_at on public.daily_check_ins;
create trigger set_daily_check_ins_updated_at
before update on public.daily_check_ins
for each row execute function public.set_current_timestamp_updated_at();

drop trigger if exists set_daily_predictions_updated_at on public.daily_predictions;
create trigger set_daily_predictions_updated_at
before update on public.daily_predictions
for each row execute function public.set_current_timestamp_updated_at();

alter table public.daily_check_ins enable row level security;
alter table public.daily_predictions enable row level security;
alter table public.daily_reveals enable row level security;

drop policy if exists "daily_check_ins_select_participant" on public.daily_check_ins;
create policy "daily_check_ins_select_participant"
on public.daily_check_ins
for select
using (
  exists (
    select 1
    from public.couples c
    where c.id = daily_check_ins.couple_id
      and c.status = 'linked'
      and auth.uid() in (c.user_1_id, c.user_2_id)
  )
);

drop policy if exists "daily_predictions_select_participant" on public.daily_predictions;
create policy "daily_predictions_select_participant"
on public.daily_predictions
for select
using (
  exists (
    select 1
    from public.couples c
    where c.id = daily_predictions.couple_id
      and c.status = 'linked'
      and auth.uid() in (c.user_1_id, c.user_2_id)
  )
);

drop policy if exists "daily_reveals_select_participant" on public.daily_reveals;
create policy "daily_reveals_select_participant"
on public.daily_reveals
for select
using (
  exists (
    select 1
    from public.couples c
    where c.id = daily_reveals.couple_id
      and c.status = 'linked'
      and auth.uid() in (c.user_1_id, c.user_2_id)
  )
);

create or replace function public.maybe_create_daily_reveal(
  target_couple_id uuid,
  target_local_day date
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  couple_record public.couples%rowtype;
  check_in_count integer;
  prediction_count integer;
  inserted_reveal_id uuid;
  previous_paired_day date;
  next_current_streak integer;
begin
  select *
  into couple_record
  from public.couples c
  where c.id = target_couple_id
    and c.status = 'linked'
  for update;

  if not found or couple_record.user_1_id is null or couple_record.user_2_id is null then
    return false;
  end if;

  select count(distinct d.user_id)
  into check_in_count
  from public.daily_check_ins d
  where d.couple_id = target_couple_id
    and d.local_day = target_local_day
    and d.user_id in (couple_record.user_1_id, couple_record.user_2_id);

  select count(distinct p.predictor_user_id)
  into prediction_count
  from public.daily_predictions p
  where p.couple_id = target_couple_id
    and p.local_day = target_local_day
    and p.predictor_user_id in (couple_record.user_1_id, couple_record.user_2_id);

  if check_in_count < 2 or prediction_count < 2 then
    return false;
  end if;

  insert into public.daily_reveals (couple_id, local_day)
  values (target_couple_id, target_local_day)
  on conflict (couple_id, local_day) do nothing
  returning id into inserted_reveal_id;

  if inserted_reveal_id is null then
    return false;
  end if;

  select max(r.local_day)
  into previous_paired_day
  from public.daily_reveals r
  where r.couple_id = target_couple_id
    and r.local_day < target_local_day;

  if previous_paired_day = target_local_day - 1 then
    next_current_streak := couple_record.current_streak + 1;
  else
    next_current_streak := 1;
  end if;

  update public.couples
  set current_streak = next_current_streak,
      longest_streak = greatest(couple_record.longest_streak, next_current_streak),
      last_paired_local_day = target_local_day,
      updated_at = timezone('utc', now())
  where id = target_couple_id;

  return true;
end;
$$;

create or replace function public.submit_daily_check_in(
  local_day date,
  mood_score integer,
  relationship_feeling_score integer,
  stress_level integer,
  optional_text text default null
)
returns table (
  ok boolean,
  error_code text,
  error_message text,
  reveal_created boolean,
  current_streak integer,
  longest_streak integer,
  submitted_local_day date
)
language plpgsql
security definer
set search_path = public
as $$
declare
  viewer_id uuid := auth.uid();
  viewer_profile public.profiles%rowtype;
  couple_record public.couples%rowtype;
  did_create_reveal boolean := false;
begin
  if viewer_id is null then
    return query select false, 'unknown'::text, 'You need to be signed in first.'::text, false, 0, 0, local_day;
    return;
  end if;

  if mood_score not between 1 and 5
    or relationship_feeling_score not between 1 and 5
    or stress_level not between 1 and 5 then
    return query select false, 'invalid_scores'::text, 'Check-in scores must be between 1 and 5.'::text, false, 0, 0, local_day;
    return;
  end if;

  if optional_text is not null and char_length(optional_text) > 280 then
    return query select false, 'invalid_text'::text, 'Keep the check-in note under 280 characters.'::text, false, 0, 0, local_day;
    return;
  end if;

  select *
  into viewer_profile
  from public.profiles p
  where p.id = viewer_id;

  if viewer_profile.current_couple_id is null then
    return query select false, 'not_linked'::text, 'Link with your partner before checking in.'::text, false, 0, 0, local_day;
    return;
  end if;

  select *
  into couple_record
  from public.couples c
  where c.id = viewer_profile.current_couple_id
    and c.status = 'linked'
    and viewer_id in (c.user_1_id, c.user_2_id);

  if not found then
    return query select false, 'not_linked'::text, 'Link with your partner before checking in.'::text, false, 0, 0, local_day;
    return;
  end if;

  if exists (
    select 1
    from public.daily_check_ins d
    where d.couple_id = couple_record.id
      and d.user_id = viewer_id
      and d.local_day = submit_daily_check_in.local_day
  ) then
    return query select false, 'duplicate_check_in'::text, 'You already checked in today.'::text, false, couple_record.current_streak, couple_record.longest_streak, local_day;
    return;
  end if;

  insert into public.daily_check_ins (
    couple_id,
    user_id,
    local_day,
    mood_score,
    relationship_feeling_score,
    stress_level,
    optional_text
  )
  values (
    couple_record.id,
    viewer_id,
    local_day,
    mood_score,
    relationship_feeling_score,
    stress_level,
    nullif(btrim(optional_text), '')
  );

  did_create_reveal := public.maybe_create_daily_reveal(couple_record.id, local_day);

  select *
  into couple_record
  from public.couples c
  where c.id = viewer_profile.current_couple_id;

  return query select true, null::text, null::text, did_create_reveal, couple_record.current_streak, couple_record.longest_streak, local_day;
end;
$$;

create or replace function public.submit_daily_prediction(
  local_day date,
  predicted_mood_score integer,
  predicted_relationship_feeling_score integer
)
returns table (
  ok boolean,
  error_code text,
  error_message text,
  reveal_created boolean,
  current_streak integer,
  longest_streak integer,
  submitted_local_day date
)
language plpgsql
security definer
set search_path = public
as $$
declare
  viewer_id uuid := auth.uid();
  viewer_profile public.profiles%rowtype;
  couple_record public.couples%rowtype;
  did_create_reveal boolean := false;
begin
  if viewer_id is null then
    return query select false, 'unknown'::text, 'You need to be signed in first.'::text, false, 0, 0, local_day;
    return;
  end if;

  if predicted_mood_score not between 1 and 5
    or predicted_relationship_feeling_score not between 1 and 5 then
    return query select false, 'invalid_scores'::text, 'Prediction scores must be between 1 and 5.'::text, false, 0, 0, local_day;
    return;
  end if;

  select *
  into viewer_profile
  from public.profiles p
  where p.id = viewer_id;

  if viewer_profile.current_couple_id is null then
    return query select false, 'not_linked'::text, 'Link with your partner before predicting.'::text, false, 0, 0, local_day;
    return;
  end if;

  select *
  into couple_record
  from public.couples c
  where c.id = viewer_profile.current_couple_id
    and c.status = 'linked'
    and viewer_id in (c.user_1_id, c.user_2_id);

  if not found then
    return query select false, 'not_linked'::text, 'Link with your partner before predicting.'::text, false, 0, 0, local_day;
    return;
  end if;

  if exists (
    select 1
    from public.daily_predictions p
    where p.couple_id = couple_record.id
      and p.predictor_user_id = viewer_id
      and p.local_day = submit_daily_prediction.local_day
  ) then
    return query select false, 'duplicate_prediction'::text, 'You already predicted today.'::text, false, couple_record.current_streak, couple_record.longest_streak, local_day;
    return;
  end if;

  insert into public.daily_predictions (
    couple_id,
    predictor_user_id,
    local_day,
    predicted_mood_score,
    predicted_relationship_feeling_score
  )
  values (
    couple_record.id,
    viewer_id,
    local_day,
    predicted_mood_score,
    predicted_relationship_feeling_score
  );

  did_create_reveal := public.maybe_create_daily_reveal(couple_record.id, local_day);

  select *
  into couple_record
  from public.couples c
  where c.id = viewer_profile.current_couple_id;

  return query select true, null::text, null::text, did_create_reveal, couple_record.current_streak, couple_record.longest_streak, local_day;
end;
$$;

create or replace function public.mark_daily_reveal_viewed(local_day date)
returns table (
  ok boolean,
  error_code text,
  error_message text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  viewer_id uuid := auth.uid();
  viewer_profile public.profiles%rowtype;
  couple_record public.couples%rowtype;
begin
  if viewer_id is null then
    return query select false, 'unknown'::text, 'You need to be signed in first.'::text;
    return;
  end if;

  select *
  into viewer_profile
  from public.profiles p
  where p.id = viewer_id;

  if viewer_profile.current_couple_id is null then
    return query select false, 'not_linked'::text, 'Link with your partner before viewing a reveal.'::text;
    return;
  end if;

  select *
  into couple_record
  from public.couples c
  where c.id = viewer_profile.current_couple_id
    and c.status = 'linked'
    and viewer_id in (c.user_1_id, c.user_2_id);

  if not found then
    return query select false, 'not_linked'::text, 'Link with your partner before viewing a reveal.'::text;
    return;
  end if;

  update public.daily_reveals r
  set user_1_viewed_at = case when couple_record.user_1_id = viewer_id then coalesce(r.user_1_viewed_at, timezone('utc', now())) else r.user_1_viewed_at end,
      user_2_viewed_at = case when couple_record.user_2_id = viewer_id then coalesce(r.user_2_viewed_at, timezone('utc', now())) else r.user_2_viewed_at end
  where r.couple_id = couple_record.id
    and r.local_day = mark_daily_reveal_viewed.local_day;

  if not found then
    return query select false, 'reveal_missing'::text, 'The reveal is not ready yet.'::text;
    return;
  end if;

  return query select true, null::text, null::text;
end;
$$;

grant execute on function public.submit_daily_check_in(date, integer, integer, integer, text) to authenticated;
grant execute on function public.submit_daily_prediction(date, integer, integer) to authenticated;
grant execute on function public.mark_daily_reveal_viewed(date) to authenticated;
