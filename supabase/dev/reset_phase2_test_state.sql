-- Tethra Phase 2 simulator reset helper
-- Run this only against your dev Supabase project.
-- Replace the two email addresses below before executing.

do $$
declare
  target_emails text[] := array[
    'partner.one@example.com',
    'partner.two@example.com'
  ];
  target_ids uuid[];
begin
  select coalesce(array_agg(id), '{}')
  into target_ids
  from auth.users
  where email = any(target_emails);

  if coalesce(array_length(target_ids, 1), 0) = 0 then
    raise exception 'No auth.users matched the supplied emails. Update target_emails first.';
  end if;

  delete from public.invite_code_audit
  where owner_id = any(target_ids)
     or couple_id in (
       select id
       from public.couples
       where user_1_id = any(target_ids)
          or user_2_id = any(target_ids)
     );

  update public.profiles
  set current_couple_id = null,
      partner_status = 'unlinked'
  where id = any(target_ids);

  delete from public.couples
  where user_1_id = any(target_ids)
     or user_2_id = any(target_ids);
end $$;
