-- SAN-59: consolidate the legacy `invitations` system (one-time, per-email
-- invite with automatic coach assignment) into `team_invite_links` (generic
-- shareable link). team_invite_links previously had no way to target a
-- specific recipient or pre-assign a coach, which is why both systems
-- existed in parallel. This adds that capability so a single table can
-- serve both use cases.

alter table public.team_invite_links
  add column if not exists email text,
  add column if not exists coach_id uuid references public.profiles(id);

comment on column public.team_invite_links.email is
  'Optional: when set, this link is targeted at a specific recipient email (legacy per-email invite). NULL means a generic shareable team link.';
comment on column public.team_invite_links.coach_id is
  'Optional: coach to auto-assign the joining athlete to. NULL means no automatic assignment (e.g. generic links, or coach-role invites).';

-- created_by previously assumed every link has a known human creator. Legacy
-- COACH-role invitations never recorded who sent them (the old `invitations`
-- table only had `coach_id`, which is null for coach-to-coach invites), so we
-- relax this for migrated rows.
alter table public.team_invite_links alter column created_by drop not null;

-- Extend the consume RPC to optionally verify the submitted email matches a
-- targeted link, and to surface email/coach_id to the caller via the
-- returned row (already SELECT * underneath).
create or replace function public.consume_team_invite_link(p_token text, p_email text default null)
returns public.team_invite_links
language plpgsql
security definer
set search_path = public
as $$
declare
    link_row public.team_invite_links;
begin
    select * into link_row
    from public.team_invite_links
    where token = p_token
    for update;

    if not found then
        raise exception 'link_not_found' using errcode = 'P0002';
    end if;

    if link_row.is_active = false then
        raise exception 'link_revoked' using errcode = 'P0001';
    end if;

    if link_row.expires_at is not null and link_row.expires_at < now() then
        raise exception 'link_expired' using errcode = 'P0001';
    end if;

    if link_row.max_uses is not null and link_row.uses >= link_row.max_uses then
        raise exception 'link_max_uses' using errcode = 'P0001';
    end if;

    if link_row.email is not null and (p_email is null or lower(trim(p_email)) <> lower(trim(link_row.email))) then
        raise exception 'link_email_mismatch' using errcode = 'P0001';
    end if;

    update public.team_invite_links
    set uses = uses + 1,
        last_used_at = now()
    where id = link_row.id
    returning * into link_row;

    return link_row;
end;
$$;

-- Migrate the still-pending legacy invitations (not yet accepted) into
-- team_invite_links so existing email links keep working once the
-- application routes switch to reading from this table. created_by falls
-- back to a team ADMIN when the legacy row didn't record one (see above).
insert into public.team_invite_links (team_id, created_by, role, token, email, coach_id, is_active, expires_at, max_uses, uses)
select
  i.team_id,
  coalesce(
    i.coach_id,
    (select p.id from public.profiles p where p.team_id = i.team_id and p.role = 'ADMIN' order by p.created_at limit 1)
  ),
  upper(i.role),
  i.token,
  i.email,
  i.coach_id,
  true,
  i.expires_at,
  1,
  0
from public.invitations i
where i.accepted = false
  and not exists (
    select 1 from public.team_invite_links t where t.token = i.token
  );
