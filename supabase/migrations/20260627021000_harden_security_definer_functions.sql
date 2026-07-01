-- Set an explicit search_path on every SECURITY DEFINER function lacking one
-- (flagged by the Supabase security advisor as "function_search_path_mutable").
-- Without this, a SECURITY DEFINER function resolves unqualified table/function
-- names using the caller's search_path, which is a known privilege-escalation
-- vector (a caller could shadow `profiles` with an object in a schema earlier
-- in their own search_path). This only pins name resolution; it does not
-- change any function's logic or return values.
alter function public.is_admin(uuid) set search_path = public;
alter function public.get_my_team_id() set search_path = public;
alter function public.check_athlete_in_group(uuid, uuid) set search_path = public;
alter function public.set_wishlist_updated_at() set search_path = public;
alter function public.touch_teams_updated_at() set search_path = public;
alter function public.touch_team_invite_links_updated_at() set search_path = public;
alter function public.is_team_staff() set search_path = public;
alter function public.update_activity_feedback_updated_at() set search_path = public;
alter function public.tr_evaluate_compliance() set search_path = public;
alter function public.purge_expired_activity_streams() set search_path = public;
alter function public.prevent_admin_action_log_mutation() set search_path = public;
alter function public.purge_expired_activity_backfill_jobs() set search_path = public;
alter function public.handle_updated_at() set search_path = public;
alter function public.handle_new_user() set search_path = public;
alter function public.consume_team_invite_link(text) set search_path = public;

-- is_admin() is a pure read-only lookup but was marked VOLATILE, which
-- prevents Postgres from caching/inlining it across rows. It is called from
-- ~10 RLS policies (often as is_admin(auth.uid())); marking it STABLE lets
-- the planner treat repeated calls within one query as cacheable.
alter function public.is_admin(uuid) stable;
