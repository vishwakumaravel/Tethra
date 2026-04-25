create or replace function public.get_or_create_weekly_receipt_v2(target_period_start_local date default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_viewer_id uuid := auth.uid();
  v_viewer_profile public.profiles%rowtype;
  v_couple public.couples%rowtype;
  v_receipt public.receipts%rowtype;
  v_current_local_day date;
  v_target_start date;
  v_target_end date;
  v_generation_version integer := 1;
  v_created boolean := false;
  v_paired_count integer := 0;
  v_two_sided_reaction_days integer := 0;
  v_confidence text := 'low';
  v_avg_compat_diff numeric := 0;
  v_avg_mood_diff numeric := 0;
  v_avg_feeling_diff numeric := 0;
  v_avg_alignment_diff numeric := 0;
  v_stress_spike_rate numeric := 0;
  v_compatibility integer := 0;
  v_communication integer := 0;
  v_emotional_alignment integer := 0;
  v_conflict_risk integer := 0;
  v_attachment_balance integer := 0;
  v_green_flag text;
  v_red_flag text;
  v_fun_insight text;
  v_summary text;
begin
  if v_viewer_id is null then
    return jsonb_build_object('ok', false, 'status', 'error', 'message', 'Sign in before opening a receipt.', 'created', false);
  end if;

  select p.*
  into v_viewer_profile
  from public.profiles as p
  where p.id = v_viewer_id;

  if v_viewer_profile.current_couple_id is null then
    return jsonb_build_object('ok', false, 'status', 'error', 'message', 'Link with your partner before receipts.', 'created', false);
  end if;

  select c.*
  into v_couple
  from public.couples as c
  where c.id = v_viewer_profile.current_couple_id
    and c.status = 'linked'
    and v_viewer_id in (c.user_1_id, c.user_2_id);

  if not found or v_couple.user_1_id is null or v_couple.user_2_id is null then
    return jsonb_build_object('ok', false, 'status', 'error', 'message', 'Link with your partner before receipts.', 'created', false);
  end if;

  v_current_local_day := (timezone(v_couple.timezone, now()))::date;
  v_target_start := public.receipt_week_start(coalesce(target_period_start_local, public.previous_closed_receipt_start(v_current_local_day)));
  v_target_end := v_target_start + 6;

  if v_target_end >= v_current_local_day then
    return jsonb_build_object(
      'ok', false,
      'status', 'not_ready',
      'message', 'This week is still cooking.',
      'created', false,
      'receipt', jsonb_build_object(
        'couple_id', v_couple.id,
        'period_start_local', v_target_start,
        'period_end_local', v_target_end,
        'generation_version', v_generation_version,
        'paired_days_count', 0,
        'confidence_label', 'low',
        'compatibility_score', 0,
        'communication_score', 0,
        'emotional_alignment_score', 0,
        'conflict_risk_score', 0,
        'attachment_balance_score', 0,
        'green_flag', null,
        'red_flag', null,
        'fun_insight', 'Come back after Sunday.',
        'summary', 'This receipt unlocks after the couple-local week closes.'
      )
    );
  end if;

  select r.*
  into v_receipt
  from public.receipts as r
  where r.couple_id = v_couple.id
    and r.period_start_local = v_target_start
    and r.generation_version = v_generation_version;

  if found then
    return jsonb_build_object(
      'ok', true,
      'status', case when v_receipt.confidence_label = 'low' then 'low_data' else 'generated' end,
      'message', null,
      'created', false,
      'receipt', to_jsonb(v_receipt)
    );
  end if;

  with reaction_counts as (
    select
      dr.local_day,
      count(distinct dr.sender_id) as reaction_count
    from public.daily_reactions as dr
    where dr.couple_id = v_couple.id
      and dr.local_day between v_target_start and v_target_end
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
    from public.daily_reveals as r
    join public.daily_check_ins as ci1
      on ci1.couple_id = r.couple_id
      and ci1.local_day = r.local_day
      and ci1.user_id = v_couple.user_1_id
    join public.daily_check_ins as ci2
      on ci2.couple_id = r.couple_id
      and ci2.local_day = r.local_day
      and ci2.user_id = v_couple.user_2_id
    left join reaction_counts as rc on rc.local_day = r.local_day
    where r.couple_id = v_couple.id
      and r.local_day between v_target_start and v_target_end
  )
  select
    count(*)::integer,
    count(*) filter (where pd.two_sided_reaction)::integer,
    coalesce(avg((pd.mood_diff + pd.feeling_diff) / 2), 0),
    coalesce(avg(pd.mood_diff), 0),
    coalesce(avg(pd.feeling_diff), 0),
    coalesce(avg((pd.mood_diff + pd.stress_diff) / 2), 0),
    case when count(*) = 0 then 0 else (count(*) filter (where pd.stress_max >= 4)::numeric / count(*)::numeric) end
  into v_paired_count, v_two_sided_reaction_days, v_avg_compat_diff, v_avg_mood_diff, v_avg_feeling_diff, v_avg_alignment_diff, v_stress_spike_rate
  from paired_days as pd;

  v_confidence := public.receipt_confidence_for_paired_days(v_paired_count);
  v_compatibility := round(least(100, greatest(0, 100 - (v_avg_compat_diff * 15))))::integer;
  v_communication := round(least(100, greatest(0, ((v_paired_count::numeric / 7) * 75) + (case when v_paired_count = 0 then 0 else (v_two_sided_reaction_days::numeric / v_paired_count) * 25 end))))::integer;
  v_emotional_alignment := round(least(100, greatest(0, 100 - (v_avg_alignment_diff * 20))))::integer;
  v_conflict_risk := round(least(100, greatest(0, (v_stress_spike_rate * 35) + (v_avg_feeling_diff * 12) + (v_avg_mood_diff * 8))))::integer;
  v_attachment_balance := round(least(100, greatest(0, 100 - (v_avg_feeling_diff * 20))))::integer;

  if v_confidence = 'low' then
    v_green_flag := case when v_paired_count > 0 then 'You still showed up together.' else null end;
    v_red_flag := null;
    v_fun_insight := 'The sample size is giving appetizer.';
    v_summary := case
      when v_paired_count = 0 then 'No full paired days yet. Do the ritual together and this receipt gets smarter.'
      else 'Tiny receipt. There is a little signal, but not enough to make the spicy reads fair yet.'
    end;
  else
    v_green_flag := case
      when v_communication >= v_compatibility and v_communication >= v_emotional_alignment and v_communication >= v_attachment_balance then 'You both kept showing up after the reveal.'
      when v_emotional_alignment >= v_compatibility and v_emotional_alignment >= v_attachment_balance then 'Your moods were weirdly in sync this week.'
      when v_attachment_balance >= v_compatibility then 'The effort looked pretty balanced.'
      else 'Your check-ins landed closer than expected.'
    end;
    v_red_flag := case
      when v_conflict_risk >= 55 then 'Stress may be doing too much in the group chat.'
      when v_communication <= v_compatibility and v_communication <= v_emotional_alignment and v_communication <= v_attachment_balance then 'The ritual needs more two-sided follow-through.'
      when v_attachment_balance <= v_compatibility and v_attachment_balance <= v_emotional_alignment then 'One side may be carrying more emotional weight.'
      when v_emotional_alignment <= v_compatibility then 'You were not always reading the same room.'
      else 'Your answers had more distance than usual.'
    end;
    v_fun_insight := case
      when v_conflict_risk >= 60 then 'One of you needed a snack and a soft launch apology.'
      when v_communication >= 75 then 'Suspiciously functional. We are watching respectfully.'
      when v_attachment_balance < 60 then 'One person was giving novel. One person was giving caption.'
      else 'The vibe was mostly synced, with just enough chaos to be believable.'
    end;
    v_summary := case
      when v_confidence = 'high' then 'Strong read: ' || v_paired_count || ' paired days gave this receipt real signal. Keep using it as a reflection, not a verdict.'
      else 'Medium read: ' || v_paired_count || ' paired days is enough for a useful reflection, but not enough for dramatic certainty.'
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
    v_couple.id,
    v_target_start,
    v_target_end,
    v_generation_version,
    v_paired_count,
    v_confidence,
    v_compatibility,
    v_communication,
    v_emotional_alignment,
    v_conflict_risk,
    v_attachment_balance,
    v_green_flag,
    v_red_flag,
    v_fun_insight,
    v_summary
  )
  on conflict on constraint receipts_couple_id_period_start_local_generation_version_key do nothing;

  select r.*
  into v_receipt
  from public.receipts as r
  where r.couple_id = v_couple.id
    and r.period_start_local = v_target_start
    and r.generation_version = v_generation_version;

  v_created := found;

  return jsonb_build_object(
    'ok', true,
    'status', case when v_receipt.confidence_label = 'low' then 'low_data' else 'generated' end,
    'message', null,
    'created', v_created,
    'receipt', to_jsonb(v_receipt)
  );
end;
$$;

grant execute on function public.get_or_create_weekly_receipt_v2(date) to authenticated;
