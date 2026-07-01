-- team_invite_links was originally only used for generic athlete-invite
-- links, so its role check only allowed 'ATHLETE'. SAN-59 also needs it to
-- carry the legacy per-email COACH invitations (3 pending rows being
-- migrated from `invitations`), so widen the constraint to match what
-- `invitations.role` already allowed.
alter table public.team_invite_links drop constraint if exists team_invite_links_role_check;
alter table public.team_invite_links add constraint team_invite_links_role_check
  check (role in ('ATHLETE', 'COACH'));
