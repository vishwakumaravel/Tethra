alter table public.couples
add column if not exists xp_points integer not null default 0 check (xp_points >= 0);

alter table public.couples
add column if not exists paired_days_count integer not null default 0 check (paired_days_count >= 0);

alter table public.couples
add column if not exists relationship_score numeric(5,2) not null default 0 check (relationship_score >= 0 and relationship_score <= 100);

alter table public.couples
add column if not exists current_tier text not null default 'Who Even Are You' check (
  current_tier in (
    'Who Even Are You',
    'Situationship Survivors',
    'Text Me Back',
    'Actually a Couple',
    'Locked In',
    'Ride or Dies',
    'Soft Married',
    'Endgame'
  )
);

alter table public.couples
add column if not exists tier_updated_at timestamptz;

create table if not exists public.daily_reactions (
  id uuid primary key default gen_random_uuid(),
  reveal_id uuid not null references public.daily_reveals (id) on delete cascade,
  couple_id uuid not null references public.couples (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  local_day date not null,
  reaction_type text not null check (reaction_type in ('heart', 'hug', 'laugh', 'oof', 'proud')),
  note text check (note is null or (char_length(btrim(note)) between 12 and 160)),
  note_normalized text,
  xp_awarded integer not null default 0 check (xp_awarded >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  unique (reveal_id, sender_id)
);

create index if not exists idx_daily_reactions_couple_day on public.daily_reactions (couple_id, local_day);
create index if not exists idx_daily_reactions_sender_note on public.daily_reactions (sender_id, note_normalized)
where note_normalized is not null;

create table if not exists public.couple_daily_metrics (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  local_day date not null,
  paired_day_completed boolean not null default false,
  prediction_accuracy_score numeric(5,2) not null default 0 check (prediction_accuracy_score >= 0 and prediction_accuracy_score <= 100),
  consistency_score numeric(5,2) not null default 0 check (consistency_score >= 0 and consistency_score <= 100),
  mutual_effort_score numeric(5,2) not null default 0 check (mutual_effort_score >= 0 and mutual_effort_score <= 100),
  interaction_depth_score numeric(5,2) not null default 0 check (interaction_depth_score >= 0 and interaction_depth_score <= 100),
  relationship_score numeric(5,2) not null default 0 check (relationship_score >= 0 and relationship_score <= 100),
  xp_awarded integer not null default 0 check (xp_awarded >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (couple_id, local_day)
);

create index if not exists idx_couple_daily_metrics_couple_day on public.couple_daily_metrics (couple_id, local_day);

create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,
  couple_id uuid references public.couples (id) on delete set null,
  event_name text not null check (
    event_name in (
      'sign_up_completed',
      'invite_created',
      'invite_joined',
      'couple_linked',
      'daily_check_in_completed',
      'daily_prediction_completed',
      'paired_day_completed',
      'daily_reveal_viewed',
      'reaction_sent',
      'note_sent',
      'streak_updated',
      'tier_updated',
      'receipt_generated',
      'receipt_viewed',
      'paywall_viewed',
      'purchase_started',
      'purchase_completed',
      'restore_completed',
      'account_deleted'
    )
  ),
  properties jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_analytics_events_user_time on public.analytics_events (user_id, created_at desc);
create index if not exists idx_analytics_events_couple_time on public.analytics_events (couple_id, created_at desc);
create index if not exists idx_analytics_events_name_time on public.analytics_events (event_name, created_at desc);

drop trigger if exists set_couple_daily_metrics_updated_at on public.couple_daily_metrics;
create trigger set_couple_daily_metrics_updated_at
before update on public.couple_daily_metrics
for each row execute function public.set_current_timestamp_updated_at();

alter table public.daily_reactions enable row level security;
alter table public.couple_daily_metrics enable row level security;
alter table public.analytics_events enable row level security;

drop policy if exists "daily_reactions_select_participant" on public.daily_reactions;
create policy "daily_reactions_select_participant"
on public.daily_reactions
for select
using (
  exists (
    select 1
    from public.couples c
    where c.id = daily_reactions.couple_id
      and c.status = 'linked'
      and auth.uid() in (c.user_1_id, c.user_2_id)
  )
);

drop policy if exists "couple_daily_metrics_select_participant" on public.couple_daily_metrics;
create policy "couple_daily_metrics_select_participant"
on public.couple_daily_metrics
for select
using (
  exists (
    select 1
    from public.couples c
    where c.id = couple_daily_metrics.couple_id
      and c.status = 'linked'
      and auth.uid() in (c.user_1_id, c.user_2_id)
  )
);

drop policy if exists "analytics_events_insert_self" on public.analytics_events;
create policy "analytics_events_insert_self"
on public.analytics_events
for insert
with check (auth.uid() = user_id);

drop policy if exists "analytics_events_select_self" on public.analytics_events;
create policy "analytics_events_select_self"
on public.analytics_events
for select
using (auth.uid() = user_id);

create or replace function public.normalize_reaction_note(input_note text)
returns text
language sql
immutable
as $$
  select nullif(lower(regexp_replace(btrim(coalesce(input_note, '')), '\s+', ' ', 'g')), '')
$$;

create or replace function public.tier_for_relationship_score(score numeric)
returns text
language sql
immutable
as $$
  select case
    when score >= 97 then 'Endgame'
    when score >= 90 then 'Soft Married'
    when score >= 80 then 'Ride or Dies'
    when score >= 65 then 'Locked In'
    when score >= 50 then 'Actually a Couple'
    when score >= 35 then 'Text Me Back'
    when score >= 20 then 'Situationship Survivors'
    else 'Who Even Are You'
  end
$$;

create or replace function public.relationship_score_cap_for_paired_days(paired_days integer)
returns numeric
language sql
immutable
as $$
  select case
    when paired_days >= 30 then 100
    when paired_days >= 21 then 96
    when paired_days >= 14 then 89
    when paired_days >= 10 then 79
    when paired_days >= 6 then 64
    when paired_days >= 3 then 49
    when paired_days >= 1 then 34
    else 19
  end::numeric
$$;

create or replace function public.recalculate_couple_progress(
  target_couple_id uuid,
  target_local_day date
)
returns table (
  relationship_score numeric,
  current_tier text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  couple_record public.couples%rowtype;
  window_start date;
  window_end date := target_local_day;
  eligible_days numeric;
  paired_days numeric;
  consistency numeric := 0;
  avg_prediction_error numeric;
  awareness numeric := 0;
  user_1_action_rate numeric := 0;
  user_2_action_rate numeric := 0;
  mutual_effort numeric := 0;
  interaction_depth numeric := 0;
  next_score numeric := 0;
  next_tier text;
  total_paired_days integer := 0;
begin
  select *
  into couple_record
  from public.couples c
  where c.id = target_couple_id
    and c.status = 'linked';

  if not found or couple_record.user_1_id is null or couple_record.user_2_id is null then
    return query select 0::numeric, 'Who Even Are You'::text;
    return;
  end if;

  window_start := target_local_day - 13;
  eligible_days := 14;

  select count(*)::numeric
  into paired_days
  from public.daily_reveals r
  where r.couple_id = target_couple_id
    and r.local_day between window_start and window_end;

  select count(*)::integer
  into total_paired_days
  from public.daily_reveals r
  where r.couple_id = target_couple_id
    and r.local_day <= target_local_day;

  consistency := least(100, greatest(0, ((paired_days / eligible_days) * 85) + ((least(couple_record.current_streak, 7)::numeric / 7) * 15)));

  select avg(error_value)
  into avg_prediction_error
  from (
    select abs(p.predicted_mood_score - ci.mood_score)::numeric as error_value
    from public.daily_reveals r
    join public.daily_predictions p on p.couple_id = r.couple_id and p.local_day = r.local_day and p.predictor_user_id = couple_record.user_1_id
    join public.daily_check_ins ci on ci.couple_id = r.couple_id and ci.local_day = r.local_day and ci.user_id = couple_record.user_2_id
    where r.couple_id = target_couple_id and r.local_day between window_start and window_end
    union all
    select abs(p.predicted_relationship_feeling_score - ci.relationship_feeling_score)::numeric
    from public.daily_reveals r
    join public.daily_predictions p on p.couple_id = r.couple_id and p.local_day = r.local_day and p.predictor_user_id = couple_record.user_1_id
    join public.daily_check_ins ci on ci.couple_id = r.couple_id and ci.local_day = r.local_day and ci.user_id = couple_record.user_2_id
    where r.couple_id = target_couple_id and r.local_day between window_start and window_end
    union all
    select abs(p.predicted_mood_score - ci.mood_score)::numeric
    from public.daily_reveals r
    join public.daily_predictions p on p.couple_id = r.couple_id and p.local_day = r.local_day and p.predictor_user_id = couple_record.user_2_id
    join public.daily_check_ins ci on ci.couple_id = r.couple_id and ci.local_day = r.local_day and ci.user_id = couple_record.user_1_id
    where r.couple_id = target_couple_id and r.local_day between window_start and window_end
    union all
    select abs(p.predicted_relationship_feeling_score - ci.relationship_feeling_score)::numeric
    from public.daily_reveals r
    join public.daily_predictions p on p.couple_id = r.couple_id and p.local_day = r.local_day and p.predictor_user_id = couple_record.user_2_id
    join public.daily_check_ins ci on ci.couple_id = r.couple_id and ci.local_day = r.local_day and ci.user_id = couple_record.user_1_id
    where r.couple_id = target_couple_id and r.local_day between window_start and window_end
  ) errors;

  awareness := least(100, greatest(0, 100 - ((coalesce(avg_prediction_error, 4) / 4) * 100)));

  select count(*)::numeric / eligible_days
  into user_1_action_rate
  from public.daily_check_ins ci
  join public.daily_predictions p on p.couple_id = ci.couple_id and p.local_day = ci.local_day and p.predictor_user_id = ci.user_id
  where ci.couple_id = target_couple_id
    and ci.user_id = couple_record.user_1_id
    and ci.local_day between window_start and window_end;

  select count(*)::numeric / eligible_days
  into user_2_action_rate
  from public.daily_check_ins ci
  join public.daily_predictions p on p.couple_id = ci.couple_id and p.local_day = ci.local_day and p.predictor_user_id = ci.user_id
  where ci.couple_id = target_couple_id
    and ci.user_id = couple_record.user_2_id
    and ci.local_day between window_start and window_end;

  mutual_effort := least(100, greatest(0, (1 - abs(coalesce(user_1_action_rate, 0) - coalesce(user_2_action_rate, 0))) * ((coalesce(user_1_action_rate, 0) + coalesce(user_2_action_rate, 0)) / 2) * 100));

  select coalesce(avg(day_score), 0)
  into interaction_depth
  from (
    select case
      when count(dr.id) filter (where dr.note is not null) >= 2 then 100
      when count(dr.id) filter (where dr.note is not null) = 1 then 75
      when count(dr.id) >= 2 then 50
      when count(dr.id) = 1 then 25
      else 0
    end::numeric as day_score
    from public.daily_reveals r
    left join public.daily_reactions dr on dr.reveal_id = r.id
    where r.couple_id = target_couple_id
      and r.local_day between window_start and window_end
    group by r.id
  ) scored_days;

  next_score := round(
    least(
      public.relationship_score_cap_for_paired_days(total_paired_days),
      greatest(0, (0.40 * consistency) + (0.30 * awareness) + (0.20 * mutual_effort) + (0.10 * interaction_depth))
    ),
    2
  );
  next_tier := public.tier_for_relationship_score(next_score);

  insert into public.couple_daily_metrics (
    couple_id,
    local_day,
    paired_day_completed,
    prediction_accuracy_score,
    consistency_score,
    mutual_effort_score,
    interaction_depth_score,
    relationship_score
  )
  values (
    target_couple_id,
    target_local_day,
    exists (select 1 from public.daily_reveals r where r.couple_id = target_couple_id and r.local_day = target_local_day),
    round(awareness, 2),
    round(consistency, 2),
    round(mutual_effort, 2),
    round(interaction_depth, 2),
    next_score
  )
  on conflict (couple_id, local_day) do update
  set paired_day_completed = excluded.paired_day_completed,
      prediction_accuracy_score = excluded.prediction_accuracy_score,
      consistency_score = excluded.consistency_score,
      mutual_effort_score = excluded.mutual_effort_score,
      interaction_depth_score = excluded.interaction_depth_score,
      relationship_score = excluded.relationship_score,
      updated_at = timezone('utc', now());

  update public.couples c
  set relationship_score = next_score,
      current_tier = next_tier,
      paired_days_count = greatest(c.paired_days_count, total_paired_days),
      tier_updated_at = case when c.current_tier is distinct from next_tier then timezone('utc', now()) else c.tier_updated_at end,
      updated_at = timezone('utc', now())
  where c.id = target_couple_id;

  return query select next_score, next_tier;
end;
$$;

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
  xp_delta integer := 10;
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

  xp_delta := xp_delta + case next_current_streak
    when 3 then 15
    when 7 then 25
    when 14 then 50
    when 30 then 75
    else 0
  end;

  update public.couples
  set current_streak = next_current_streak,
      longest_streak = greatest(couple_record.longest_streak, next_current_streak),
      last_paired_local_day = target_local_day,
      paired_days_count = coalesce(couple_record.paired_days_count, 0) + 1,
      xp_points = coalesce(couple_record.xp_points, 0) + xp_delta,
      updated_at = timezone('utc', now())
  where id = target_couple_id;

  insert into public.couple_daily_metrics (couple_id, local_day, paired_day_completed, xp_awarded)
  values (target_couple_id, target_local_day, true, xp_delta)
  on conflict (couple_id, local_day) do update
  set paired_day_completed = true,
      xp_awarded = couple_daily_metrics.xp_awarded + xp_delta,
      updated_at = timezone('utc', now());

  perform public.recalculate_couple_progress(target_couple_id, target_local_day);

  return true;
end;
$$;

create or replace function public.submit_daily_reaction(
  reveal_id uuid,
  reaction_type text,
  note text default null
)
returns table (
  ok boolean,
  error_code text,
  error_message text,
  xp_awarded integer,
  total_xp integer,
  relationship_score numeric,
  current_tier text,
  note_saved boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  viewer_id uuid := auth.uid();
  viewer_profile public.profiles%rowtype;
  couple_record public.couples%rowtype;
  reveal_record public.daily_reveals%rowtype;
  normalized_reaction text := lower(btrim(coalesce(reaction_type, '')));
  trimmed_note text := nullif(btrim(note), '');
  note_norm text := public.normalize_reaction_note(note);
  reaction_xp integer := 2;
  progress_record record;
begin
  if viewer_id is null then
    return query select false, 'unknown'::text, 'You need to be signed in first.'::text, 0, 0, 0::numeric, 'Who Even Are You'::text, false;
    return;
  end if;

  if normalized_reaction not in ('heart', 'hug', 'laugh', 'oof', 'proud') then
    return query select false, 'invalid_reaction'::text, 'Choose one of the reveal reactions.'::text, 0, 0, 0::numeric, 'Who Even Are You'::text, false;
    return;
  end if;

  if trimmed_note is not null and char_length(trimmed_note) not between 12 and 160 then
    return query select false, 'invalid_note'::text, 'Keep reveal notes between 12 and 160 characters.'::text, 0, 0, 0::numeric, 'Who Even Are You'::text, false;
    return;
  end if;

  select *
  into viewer_profile
  from public.profiles p
  where p.id = viewer_id;

  if viewer_profile.current_couple_id is null then
    return query select false, 'not_linked'::text, 'Link with your partner before reacting.'::text, 0, 0, 0::numeric, 'Who Even Are You'::text, false;
    return;
  end if;

  select *
  into couple_record
  from public.couples c
  where c.id = viewer_profile.current_couple_id
    and c.status = 'linked'
    and viewer_id in (c.user_1_id, c.user_2_id)
  for update;

  if not found then
    return query select false, 'not_linked'::text, 'Link with your partner before reacting.'::text, 0, 0, 0::numeric, 'Who Even Are You'::text, false;
    return;
  end if;

  select *
  into reveal_record
  from public.daily_reveals r
  where r.id = submit_daily_reaction.reveal_id
    and r.couple_id = couple_record.id;

  if not found then
    return query select false, 'reveal_missing'::text, 'The reveal is not ready yet.'::text, 0, couple_record.xp_points, couple_record.relationship_score, couple_record.current_tier, false;
    return;
  end if;

  if exists (
    select 1
    from public.daily_reactions dr
    where dr.reveal_id = reveal_record.id
      and dr.sender_id = viewer_id
  ) then
    return query select false, 'duplicate_reaction'::text, 'You already reacted to this reveal.'::text, 0, couple_record.xp_points, couple_record.relationship_score, couple_record.current_tier, false;
    return;
  end if;

  if note_norm is not null and exists (
    select 1
    from public.daily_reactions dr
    where dr.sender_id = viewer_id
      and dr.note_normalized = note_norm
      and dr.created_at > timezone('utc', now()) - interval '14 days'
  ) then
    return query select false, 'repeated_note'::text, 'Try writing something a little more specific for today.'::text, 0, couple_record.xp_points, couple_record.relationship_score, couple_record.current_tier, false;
    return;
  end if;

  insert into public.daily_reactions (
    reveal_id,
    couple_id,
    sender_id,
    local_day,
    reaction_type,
    note,
    note_normalized,
    xp_awarded
  )
  values (
    reveal_record.id,
    couple_record.id,
    viewer_id,
    reveal_record.local_day,
    normalized_reaction,
    trimmed_note,
    note_norm,
    reaction_xp
  );

  update public.couples
  set xp_points = xp_points + reaction_xp,
      updated_at = timezone('utc', now())
  where id = couple_record.id;

  insert into public.couple_daily_metrics (couple_id, local_day, xp_awarded)
  values (couple_record.id, reveal_record.local_day, reaction_xp)
  on conflict (couple_id, local_day) do update
  set xp_awarded = couple_daily_metrics.xp_awarded + reaction_xp,
      updated_at = timezone('utc', now());

  select *
  into progress_record
  from public.recalculate_couple_progress(couple_record.id, reveal_record.local_day)
  limit 1;

  select *
  into couple_record
  from public.couples c
  where c.id = viewer_profile.current_couple_id;

  return query select true, null::text, null::text, reaction_xp, couple_record.xp_points, progress_record.relationship_score, progress_record.current_tier, trimmed_note is not null;
end;
$$;

grant execute on function public.submit_daily_reaction(uuid, text, text) to authenticated;
