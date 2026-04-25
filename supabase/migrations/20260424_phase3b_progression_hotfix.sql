alter table public.couples
add column if not exists paired_days_count integer not null default 0 check (paired_days_count >= 0);

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
  window_start date := target_local_day - 13;
  window_end date := target_local_day;
  eligible_days numeric := 14;
  paired_days numeric;
  total_paired_days integer := 0;
  consistency numeric := 0;
  avg_prediction_error numeric;
  awareness numeric := 0;
  user_1_action_rate numeric := 0;
  user_2_action_rate numeric := 0;
  mutual_effort numeric := 0;
  interaction_depth numeric := 0;
  next_score numeric := 0;
  next_tier text;
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

update public.couples c
set paired_days_count = coalesce(reveal_counts.paired_days_count, 0)
from (
  select couple_id, count(*)::integer as paired_days_count
  from public.daily_reveals
  group by couple_id
) reveal_counts
where c.id = reveal_counts.couple_id;

do $$
declare
  couple_record record;
begin
  for couple_record in
    select id, last_paired_local_day
    from public.couples
    where status = 'linked'
      and last_paired_local_day is not null
  loop
    perform public.recalculate_couple_progress(couple_record.id, couple_record.last_paired_local_day);
  end loop;
end $$;
