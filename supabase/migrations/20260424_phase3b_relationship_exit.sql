create or replace function public.end_current_relationship()
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
  couple_record public.couples%rowtype;
  affected_user_ids uuid[];
begin
  if viewer_id is null then
    return query select false, 'unknown'::text, 'You need to be signed in first.'::text;
    return;
  end if;

  select *
  into couple_record
  from public.couples c
  where viewer_id in (c.user_1_id, c.user_2_id)
  order by case when c.status = 'linked' then 0 else 1 end, c.created_at desc
  limit 1
  for update;

  if not found then
    update public.profiles
    set current_couple_id = null,
        partner_status = 'unlinked',
        updated_at = timezone('utc', now())
    where id = viewer_id;

    return query select true, null::text, null::text;
    return;
  end if;

  affected_user_ids := array_remove(array[couple_record.user_1_id, couple_record.user_2_id], null);

  delete from public.analytics_events
  where couple_id = couple_record.id;

  update public.profiles
  set current_couple_id = null,
      partner_status = 'unlinked',
      updated_at = timezone('utc', now())
  where id = any(affected_user_ids);

  delete from public.couples
  where id = couple_record.id;

  return query select true, null::text, null::text;
end;
$$;

grant execute on function public.end_current_relationship() to authenticated;
