create table if not exists public.receipts (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  period_start_local date not null,
  period_end_local date not null,
  generation_version integer not null default 1 check (generation_version >= 1),
  paired_days_count integer not null default 0 check (paired_days_count between 0 and 7),
  confidence_label text not null check (confidence_label in ('low', 'medium', 'high')),
  compatibility_score integer not null default 0 check (compatibility_score between 0 and 100),
  communication_score integer not null default 0 check (communication_score between 0 and 100),
  emotional_alignment_score integer not null default 0 check (emotional_alignment_score between 0 and 100),
  conflict_risk_score integer not null default 0 check (conflict_risk_score between 0 and 100),
  attachment_balance_score integer not null default 0 check (attachment_balance_score between 0 and 100),
  green_flag text,
  red_flag text,
  fun_insight text not null,
  summary text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (couple_id, period_start_local, generation_version)
);

create index if not exists idx_receipts_couple_period on public.receipts (couple_id, period_start_local desc);

drop trigger if exists set_receipts_updated_at on public.receipts;
create trigger set_receipts_updated_at
before update on public.receipts
for each row execute function public.set_current_timestamp_updated_at();

alter table public.receipts enable row level security;

drop policy if exists "receipts_select_participant" on public.receipts;
create policy "receipts_select_participant"
on public.receipts
for select
using (
  exists (
    select 1
    from public.couples c
    where c.id = receipts.couple_id
      and c.status = 'linked'
      and auth.uid() in (c.user_1_id, c.user_2_id)
  )
);

create or replace function public.receipt_confidence_for_paired_days(paired_days integer)
returns text
language sql
immutable
as $$
  select case
    when paired_days >= 6 then 'high'
    when paired_days >= 4 then 'medium'
    else 'low'
  end
$$;

create or replace function public.receipt_week_start(local_day date)
returns date
language sql
immutable
as $$
  select (local_day - ((extract(isodow from local_day)::integer - 1) * interval '1 day'))::date
$$;

create or replace function public.previous_closed_receipt_start(current_local_day date)
returns date
language sql
immutable
as $$
  select public.receipt_week_start(current_local_day) - 7
$$;

create or replace function public.get_or_create_weekly_receipt(target_period_start_local date default null)
returns table (
  ok boolean,
  status text,
  message text,
  created boolean,
  id uuid,
  couple_id uuid,
  period_start_local date,
  period_end_local date,
  generation_version integer,
  paired_days_count integer,
  confidence_label text,
  compatibility_score integer,
  communication_score integer,
  emotional_alignment_score integer,
  conflict_risk_score integer,
  attachment_balance_score integer,
  green_flag text,
  red_flag text,
  fun_insight text,
  summary text,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  viewer_id uuid := auth.uid();
  viewer_profile public.profiles%rowtype;
  couple_record public.couples%rowtype;
  receipt_record public.receipts%rowtype;
  current_local_day date;
  target_start date;
  target_end date;
  generation_v integer := 1;
  did_create boolean := false;
  paired_count integer := 0;
  two_sided_reaction_days integer := 0;
  confidence text := 'low';
  avg_compat_diff numeric := 0;
  avg_mood_diff numeric := 0;
  avg_feeling_diff numeric := 0;
  avg_alignment_diff numeric := 0;
  stress_spike_rate numeric := 0;
  compatibility integer := 0;
  communication integer := 0;
  emotional_alignment integer := 0;
  conflict_risk integer := 0;
  attachment_balance integer := 0;
  next_green_flag text;
  next_red_flag text;
  next_fun_insight text;
  next_summary text;
begin
  if viewer_id is null then
    return query select false, 'error'::text, 'Sign in before opening a receipt.'::text, false,
      null::uuid, null::uuid, null::date, null::date, null::integer, null::integer, null::text,
      null::integer, null::integer, null::integer, null::integer, null::integer,
      null::text, null::text, null::text, null::text, null::timestamptz, null::timestamptz;
    return;
  end if;

  select *
  into viewer_profile
  from public.profiles p
  where p.id = viewer_id;

  if viewer_profile.current_couple_id is null then
    return query select false, 'error'::text, 'Link with your partner before receipts.'::text, false,
      null::uuid, null::uuid, null::date, null::date, null::integer, null::integer, null::text,
      null::integer, null::integer, null::integer, null::integer, null::integer,
      null::text, null::text, null::text, null::text, null::timestamptz, null::timestamptz;
    return;
  end if;

  select *
  into couple_record
  from public.couples c
  where c.id = viewer_profile.current_couple_id
    and c.status = 'linked'
    and viewer_id in (c.user_1_id, c.user_2_id);

  if not found or couple_record.user_1_id is null or couple_record.user_2_id is null then
    return query select false, 'error'::text, 'Link with your partner before receipts.'::text, false,
      null::uuid, null::uuid, null::date, null::date, null::integer, null::integer, null::text,
      null::integer, null::integer, null::integer, null::integer, null::integer,
      null::text, null::text, null::text, null::text, null::timestamptz, null::timestamptz;
    return;
  end if;

  current_local_day := (timezone(couple_record.timezone, now()))::date;
  target_start := public.receipt_week_start(coalesce(target_period_start_local, public.previous_closed_receipt_start(current_local_day)));
  target_end := target_start + 6;

  if target_end >= current_local_day then
    return query select false, 'not_ready'::text, 'This week is still cooking.'::text, false,
      null::uuid, couple_record.id, target_start, target_end, generation_v, 0, 'low'::text,
      0, 0, 0, 0, 0,
      null::text, null::text, 'Come back after Sunday.'::text, 'This receipt unlocks after the couple-local week closes.'::text,
      null::timestamptz, null::timestamptz;
    return;
  end if;

  select *
  into receipt_record
  from public.receipts r
  where r.couple_id = couple_record.id
    and r.period_start_local = target_start
    and r.generation_version = generation_v;

  if found then
    return query select true, case when receipt_record.confidence_label = 'low' then 'low_data' else 'generated' end, null::text, false,
      receipt_record.id, receipt_record.couple_id, receipt_record.period_start_local, receipt_record.period_end_local,
      receipt_record.generation_version, receipt_record.paired_days_count, receipt_record.confidence_label,
      receipt_record.compatibility_score, receipt_record.communication_score, receipt_record.emotional_alignment_score,
      receipt_record.conflict_risk_score, receipt_record.attachment_balance_score,
      receipt_record.green_flag, receipt_record.red_flag, receipt_record.fun_insight, receipt_record.summary,
      receipt_record.created_at, receipt_record.updated_at;
    return;
  end if;

  with reaction_counts as (
    select
      dr.local_day,
      count(distinct dr.sender_id) as reaction_count
    from public.daily_reactions dr
    where dr.couple_id = couple_record.id
      and dr.local_day between target_start and target_end
    group by dr.local_day
  ),
  paired_days as (
    select
      r.local_day,
      abs(ci1.mood_score - ci2.mood_score)::numeric as mood_diff,
      abs(ci1.relationship_feeling_score - ci2.relationship_feeling_score)::numeric as feeling_diff,
      abs(ci1.stress_level - ci2.stress_level)::numeric as stress_diff,
      greatest(ci1.stress_level, ci2.stress_level)::numeric as stress_max,
      coalesce(rc.reaction_count, 0) >= 2 as two_sided_reaction
    from public.daily_reveals r
    join public.daily_check_ins ci1
      on ci1.couple_id = r.couple_id
      and ci1.local_day = r.local_day
      and ci1.user_id = couple_record.user_1_id
    join public.daily_check_ins ci2
      on ci2.couple_id = r.couple_id
      and ci2.local_day = r.local_day
      and ci2.user_id = couple_record.user_2_id
    left join reaction_counts rc on rc.local_day = r.local_day
    where r.couple_id = couple_record.id
      and r.local_day between target_start and target_end
  )
  select
    count(*)::integer,
    count(*) filter (where two_sided_reaction)::integer,
    coalesce(avg((mood_diff + feeling_diff) / 2), 0),
    coalesce(avg(mood_diff), 0),
    coalesce(avg(feeling_diff), 0),
    coalesce(avg((mood_diff + stress_diff) / 2), 0),
    case when count(*) = 0 then 0 else (count(*) filter (where stress_max >= 4)::numeric / count(*)::numeric) end
  into paired_count, two_sided_reaction_days, avg_compat_diff, avg_mood_diff, avg_feeling_diff, avg_alignment_diff, stress_spike_rate
  from paired_days;

  confidence := public.receipt_confidence_for_paired_days(paired_count);
  compatibility := round(least(100, greatest(0, 100 - (avg_compat_diff * 15))))::integer;
  communication := round(least(100, greatest(0, ((paired_count::numeric / 7) * 75) + (case when paired_count = 0 then 0 else (two_sided_reaction_days::numeric / paired_count) * 25 end))))::integer;
  emotional_alignment := round(least(100, greatest(0, 100 - (avg_alignment_diff * 20))))::integer;
  conflict_risk := round(least(100, greatest(0, (stress_spike_rate * 35) + (avg_feeling_diff * 12) + (avg_mood_diff * 8))))::integer;
  attachment_balance := round(least(100, greatest(0, 100 - (avg_feeling_diff * 20))))::integer;

  if confidence = 'low' then
    next_green_flag := case when paired_count > 0 then 'You still showed up together.' else null end;
    next_red_flag := null;
    next_fun_insight := 'The sample size is giving appetizer.';
    next_summary := case
      when paired_count = 0 then 'No full paired days yet. Do the ritual together and this receipt gets smarter.'
      else 'Tiny receipt. There is a little signal, but not enough to make the spicy reads fair yet.'
    end;
  else
    next_green_flag := case
      when communication >= compatibility and communication >= emotional_alignment and communication >= attachment_balance then 'You both kept showing up after the reveal.'
      when emotional_alignment >= compatibility and emotional_alignment >= attachment_balance then 'Your moods were weirdly in sync this week.'
      when attachment_balance >= compatibility then 'The effort looked pretty balanced.'
      else 'Your check-ins landed closer than expected.'
    end;

    next_red_flag := case
      when conflict_risk >= 55 then 'Stress may be doing too much in the group chat.'
      when communication <= compatibility and communication <= emotional_alignment and communication <= attachment_balance then 'The ritual needs more two-sided follow-through.'
      when attachment_balance <= compatibility and attachment_balance <= emotional_alignment then 'One side may be carrying more emotional weight.'
      when emotional_alignment <= compatibility then 'You were not always reading the same room.'
      else 'Your answers had more distance than usual.'
    end;

    next_fun_insight := case
      when conflict_risk >= 60 then 'One of you needed a snack and a soft launch apology.'
      when communication >= 75 then 'Suspiciously functional. We are watching respectfully.'
      when attachment_balance < 60 then 'One person was giving novel. One person was giving caption.'
      else 'The vibe was mostly synced, with just enough chaos to be believable.'
    end;

    next_summary := case
      when confidence = 'high' then
        'Strong read: ' || paired_count || ' paired days gave this receipt real signal. Keep using it as a reflection, not a verdict.'
      else
        'Medium read: ' || paired_count || ' paired days is enough for a useful reflection, but not enough for dramatic certainty.'
    end;
  end if;

  insert into public.receipts (
    couple_id,
    period_start_local,
    period_end_local,
    generation_version,
    paired_days_count,
    confidence_label,
    compatibility_score,
    communication_score,
    emotional_alignment_score,
    conflict_risk_score,
    attachment_balance_score,
    green_flag,
    red_flag,
    fun_insight,
    summary
  )
  values (
    couple_record.id,
    target_start,
    target_end,
    generation_v,
    paired_count,
    confidence,
    compatibility,
    communication,
    emotional_alignment,
    conflict_risk,
    attachment_balance,
    next_green_flag,
    next_red_flag,
    next_fun_insight,
    next_summary
  )
  on conflict on constraint receipts_couple_id_period_start_local_generation_version_key do nothing
  returning * into receipt_record;

  did_create := receipt_record.id is not null;

  if receipt_record.id is null then
    select *
    into receipt_record
    from public.receipts r
    where r.couple_id = couple_record.id
      and r.period_start_local = target_start
      and r.generation_version = generation_v;
  end if;

  return query select true, case when receipt_record.confidence_label = 'low' then 'low_data' else 'generated' end, null::text, did_create,
    receipt_record.id, receipt_record.couple_id, receipt_record.period_start_local, receipt_record.period_end_local,
    receipt_record.generation_version, receipt_record.paired_days_count, receipt_record.confidence_label,
    receipt_record.compatibility_score, receipt_record.communication_score, receipt_record.emotional_alignment_score,
    receipt_record.conflict_risk_score, receipt_record.attachment_balance_score,
    receipt_record.green_flag, receipt_record.red_flag, receipt_record.fun_insight, receipt_record.summary,
    receipt_record.created_at, receipt_record.updated_at;
end;
$$;

grant execute on function public.get_or_create_weekly_receipt(date) to authenticated;

do $$
begin
  begin
    alter publication supabase_realtime add table public.receipts;
  exception
    when duplicate_object then null;
    when undefined_object then null;
  end;
end;
$$;
