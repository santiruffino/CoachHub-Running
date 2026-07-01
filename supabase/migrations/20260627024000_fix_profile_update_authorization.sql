-- Fix authorization bug: "Users can update own profile" allowed ANY member
-- of a team to update ANY other member's profile in the same team (the
-- USING clause only checked team_id, not the caller's role), since no
-- WITH CHECK was specified the same condition implicitly applied on write.
-- This let an athlete modify a teammate's profile (including another
-- athlete's), which was never intended -- only the profile owner or
-- team staff (COACH/ADMIN) should be able to update a teammate's profile.
--
-- is_team_staff() returns true for COACH and ADMIN roles (see
-- 20260429000000_team_based_rls.sql). ADMIN already has a separate
-- unconditional policy ("Admins can update all profiles"); requiring
-- is_team_staff() here just closes the gap for plain athletes.
alter policy "Users can update own profile" on public.profiles
  using ((id = (select auth.uid())) OR (team_id = get_my_team_id() AND is_team_staff()));
