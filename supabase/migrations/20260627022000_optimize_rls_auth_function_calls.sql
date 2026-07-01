-- Wrap auth.uid()/auth.role() calls in RLS policies with (select ...) so
-- Postgres evaluates them once per query (via InitPlan) instead of once per
-- row. Flagged by the Supabase performance advisor as 'auth_rls_initplan'
-- across 22 tables / 73 occurrences. This is a pure rewrite: every USING/
-- WITH CHECK expression is semantically identical, just wrapped so the
-- planner can cache the auth function result. No access-control behavior
-- changes.

ALTER POLICY "Users can delete own activities" ON public.activities USING (((select auth.uid()) = user_id));
ALTER POLICY "Users can insert own activities" ON public.activities WITH CHECK (((select auth.uid()) = user_id));
ALTER POLICY "Admins can read all activities" ON public.activities USING (is_admin((select auth.uid())));
ALTER POLICY "Users can read own activities" ON public.activities USING (((select auth.uid()) = user_id));
ALTER POLICY "Users can update own activities" ON public.activities USING (((select auth.uid()) = user_id));
ALTER POLICY "Users can update own activities" ON public.activities WITH CHECK (((select auth.uid()) = user_id));
ALTER POLICY "Service role can manage activity backfill jobs" ON public.activity_backfill_jobs USING (((select auth.role()) = 'service_role'::text));
ALTER POLICY "Service role can manage activity backfill jobs" ON public.activity_backfill_jobs WITH CHECK (((select auth.role()) = 'service_role'::text));
ALTER POLICY "Athletes can view their own compliance" ON public.activity_compliance USING ((EXISTS ( SELECT 1
   FROM activities a
  WHERE ((a.id = activity_compliance.activity_id) AND (a.user_id = (select auth.uid()))))));
ALTER POLICY "Athletes can manage own feedback" ON public.activity_feedback USING ((user_id = (select auth.uid())));
ALTER POLICY "Athletes can manage own feedback" ON public.activity_feedback WITH CHECK ((user_id = (select auth.uid())));
ALTER POLICY "Admins can insert own admin action logs" ON public.admin_action_logs WITH CHECK (((actor_id = (select auth.uid())) AND (team_id = get_my_team_id()) AND (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = (select auth.uid())) AND (p.role = 'ADMIN'::role_type))))));
ALTER POLICY "Admins can read team admin action logs" ON public.admin_action_logs USING (((team_id = get_my_team_id()) AND (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = (select auth.uid())) AND (p.role = 'ADMIN'::role_type))))));
ALTER POLICY "Team staff can view team alerts" ON public.alerts USING (((team_id = get_my_team_id()) OR (athlete_id = (select auth.uid()))));
ALTER POLICY "Admins can do everything on athlete_groups" ON public.athlete_groups USING (is_admin((select auth.uid())));
ALTER POLICY "Coaches can delete athlete groups" ON public.athlete_groups USING ((EXISTS ( SELECT 1
   FROM groups g
  WHERE ((g.id = athlete_groups.group_id) AND (g.coach_id = (select auth.uid()))))));
ALTER POLICY "Coaches can insert athlete groups" ON public.athlete_groups WITH CHECK ((EXISTS ( SELECT 1
   FROM groups g
  WHERE ((g.id = athlete_groups.group_id) AND (g.coach_id = (select auth.uid()))))));
ALTER POLICY "Athletes can read own group memberships" ON public.athlete_groups USING (((select auth.uid()) = athlete_id));
ALTER POLICY "Athletes can view own group memberships" ON public.athlete_groups USING ((athlete_id = (select auth.uid())));
ALTER POLICY "Coaches can read athlete groups" ON public.athlete_groups USING ((EXISTS ( SELECT 1
   FROM groups g
  WHERE ((g.id = athlete_groups.group_id) AND (g.coach_id = (select auth.uid()))))));
ALTER POLICY "Admins can do everything on athlete_profiles" ON public.athlete_profiles USING (is_admin((select auth.uid())));
ALTER POLICY "Athletes can insert own athlete profile" ON public.athlete_profiles WITH CHECK (((select auth.uid()) = user_id));
ALTER POLICY "Athletes can read own athlete profile" ON public.athlete_profiles USING (((select auth.uid()) = user_id));
ALTER POLICY "Coaches can read athlete profiles" ON public.athlete_profiles USING (((EXISTS ( SELECT 1
   FROM (athlete_groups ag
     JOIN groups g ON ((ag.group_id = g.id)))
  WHERE ((ag.athlete_id = athlete_profiles.user_id) AND (g.coach_id = (select auth.uid()))))) OR (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = athlete_profiles.user_id) AND (p.coach_id = (select auth.uid())))))));
ALTER POLICY "Athletes can update own athlete profile" ON public.athlete_profiles USING (((select auth.uid()) = user_id));
ALTER POLICY "Athletes can update own athlete profile" ON public.athlete_profiles WITH CHECK (((select auth.uid()) = user_id));
ALTER POLICY "Athletes can view their own races" ON public.athlete_races USING ((athlete_id = (select auth.uid())));
ALTER POLICY "Athletes can update their own races" ON public.athlete_races USING ((athlete_id = (select auth.uid())));
ALTER POLICY "Thread participants can send messages" ON public.coach_athlete_messages WITH CHECK (((sender_id = (select auth.uid())) AND (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = coach_athlete_messages.athlete_id) AND (p.role = 'ATHLETE'::role_type) AND (p.coach_id = p.coach_id) AND (((select auth.uid()) = coach_athlete_messages.athlete_id) OR ((select auth.uid()) = p.coach_id)))))));
ALTER POLICY "Thread participants can view messages" ON public.coach_athlete_messages USING (((athlete_id = (select auth.uid())) OR (coach_id = (select auth.uid()))));
ALTER POLICY "Thread participants can mark messages read" ON public.coach_athlete_messages USING (((athlete_id = (select auth.uid())) OR (coach_id = (select auth.uid()))));
ALTER POLICY "Thread participants can mark messages read" ON public.coach_athlete_messages WITH CHECK (((athlete_id = (select auth.uid())) OR (coach_id = (select auth.uid()))));
ALTER POLICY "Admins can do everything on coach_profiles" ON public.coach_profiles USING (is_admin((select auth.uid())));
ALTER POLICY "Coaches can insert own coach profile" ON public.coach_profiles WITH CHECK (((select auth.uid()) = user_id));
ALTER POLICY "Coaches can read own coach profile" ON public.coach_profiles USING (((select auth.uid()) = user_id));
ALTER POLICY "Coaches can update own coach profile" ON public.coach_profiles USING (((select auth.uid()) = user_id));
ALTER POLICY "Coaches can update own coach profile" ON public.coach_profiles WITH CHECK (((select auth.uid()) = user_id));
ALTER POLICY "Coaches can manage own settings" ON public.coach_settings USING (((team_id = get_my_team_id()) AND ((coach_id = (select auth.uid())) OR (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = (select auth.uid())) AND (p.role = 'ADMIN'::role_type)))))));
ALTER POLICY "Coaches can manage own settings" ON public.coach_settings WITH CHECK (((team_id = get_my_team_id()) AND ((coach_id = (select auth.uid())) OR (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = (select auth.uid())) AND (p.role = 'ADMIN'::role_type)))))));
ALTER POLICY "Admins can do everything on groups" ON public.groups USING (is_admin((select auth.uid())));
ALTER POLICY "Coaches can insert own groups" ON public.groups WITH CHECK (((select auth.uid()) = coach_id));
ALTER POLICY "Athletes can read their groups" ON public.groups USING (check_athlete_in_group(id, (select auth.uid())));
ALTER POLICY "Coaches can read own groups" ON public.groups USING (((select auth.uid()) = coach_id));
ALTER POLICY "Coaches can create invitations" ON public.invitations WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = 'COACH'::role_type)))));
ALTER POLICY "Coaches can view invitations" ON public.invitations USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = 'COACH'::role_type)))));
ALTER POLICY "Athletes can view their own matching logs" ON public.matching_log USING ((EXISTS ( SELECT 1
   FROM activities a
  WHERE ((a.id = matching_log.activity_id) AND (a.user_id = (select auth.uid()))))));
ALTER POLICY "Coaches can view matching logs for their athletes" ON public.matching_log USING ((EXISTS ( SELECT 1
   FROM (activities a
     JOIN profiles p ON ((p.id = a.user_id)))
  WHERE ((a.id = matching_log.activity_id) AND (p.coach_id = (select auth.uid()))))));
ALTER POLICY "Admins can read all profiles" ON public.profiles USING (is_admin((select auth.uid())));
ALTER POLICY "Athletes can read own coach profile" ON public.profiles USING ((((select auth.uid()) = id) OR ((select auth.uid()) = coach_id) OR (EXISTS ( SELECT 1
   FROM (athlete_groups ag
     JOIN groups g ON ((ag.group_id = g.id)))
  WHERE ((ag.athlete_id = profiles.id) AND (g.coach_id = (select auth.uid())))))));
ALTER POLICY "Coaches can read athlete profiles" ON public.profiles USING ((((select auth.uid()) = id) OR (EXISTS ( SELECT 1
   FROM groups g
  WHERE ((g.coach_id = (select auth.uid())) AND (EXISTS ( SELECT 1
           FROM athlete_groups ag
          WHERE ((ag.group_id = g.id) AND (ag.athlete_id = profiles.id)))))))));
ALTER POLICY "Users can read own profile" ON public.profiles USING (((select auth.uid()) = id));
ALTER POLICY "Users can view own and team profiles" ON public.profiles USING (((id = (select auth.uid())) OR (team_id = get_my_team_id())));
ALTER POLICY "Admins can update all profiles" ON public.profiles USING (is_admin((select auth.uid())));
ALTER POLICY "Users can update own profile" ON public.profiles USING (((id = (select auth.uid())) OR (team_id = get_my_team_id())));
ALTER POLICY "Athletes can see races assigned to them" ON public.races USING ((EXISTS ( SELECT 1
   FROM athlete_races ar
  WHERE ((ar.race_id = races.id) AND (ar.athlete_id = (select auth.uid()))))));
ALTER POLICY "Admins have full access to running teams" ON public.running_teams USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = 'ADMIN'::role_type)))));
ALTER POLICY "Coaches can manage their own running teams" ON public.running_teams USING ((coach_id = (select auth.uid())));
ALTER POLICY "Coaches can manage their own running teams" ON public.running_teams WITH CHECK ((coach_id = (select auth.uid())));
ALTER POLICY "Admins can create teams" ON public.running_teams WITH CHECK (((select auth.role()) = 'authenticated'::text));
ALTER POLICY "Users can view their own running team details" ON public.running_teams USING ((id = ( SELECT profiles.team_id
   FROM profiles
  WHERE (profiles.id = (select auth.uid())))));
ALTER POLICY "Admins and Coaches can update their own running team" ON public.running_teams USING ((id = ( SELECT profiles.team_id
   FROM profiles
  WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = ANY (ARRAY['ADMIN'::role_type, 'COACH'::role_type]))))));
ALTER POLICY "Users can delete own strava connection" ON public.strava_connections USING (((select auth.uid()) = user_id));
ALTER POLICY "Users can insert own strava connection" ON public.strava_connections WITH CHECK (((select auth.uid()) = user_id));
ALTER POLICY "Coaches can read athlete strava connections" ON public.strava_connections USING ((EXISTS ( SELECT 1
   FROM (athlete_groups ag
     JOIN groups g ON ((ag.group_id = g.id)))
  WHERE ((ag.athlete_id = strava_connections.user_id) AND (g.coach_id = (select auth.uid()))))));
ALTER POLICY "Users can read own strava connection" ON public.strava_connections USING (((select auth.uid()) = user_id));
ALTER POLICY "Users can update own strava connection" ON public.strava_connections USING (((select auth.uid()) = user_id));
ALTER POLICY "Users can update own strava connection" ON public.strava_connections WITH CHECK (((select auth.uid()) = user_id));
ALTER POLICY "Admins can write team settings" ON public.team_settings USING (((team_id = get_my_team_id()) AND (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = (select auth.uid())) AND (p.role = 'ADMIN'::role_type))))));
ALTER POLICY "Admins can write team settings" ON public.team_settings WITH CHECK (((team_id = get_my_team_id()) AND (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = (select auth.uid())) AND (p.role = 'ADMIN'::role_type))))));
ALTER POLICY "Admins can do everything on training_assignments" ON public.training_assignments USING (is_admin((select auth.uid())));
ALTER POLICY "Team staff can manage assignments" ON public.training_assignments USING (((user_id IN ( SELECT p.id
   FROM profiles p
  WHERE (p.team_id = get_my_team_id()))) OR (user_id = (select auth.uid()))));
ALTER POLICY "Coaches can delete athlete assignments" ON public.training_assignments USING ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = training_assignments.user_id) AND (p.coach_id = (select auth.uid()))))));
ALTER POLICY "Coaches can insert athlete assignments" ON public.training_assignments WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = training_assignments.user_id) AND (p.coach_id = (select auth.uid()))))));
ALTER POLICY "Athletes can read own assignments" ON public.training_assignments USING (((select auth.uid()) = user_id));
ALTER POLICY "Athletes can view own assignments" ON public.training_assignments USING ((user_id = (select auth.uid())));
ALTER POLICY "Coaches can read athlete assignments" ON public.training_assignments USING ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = training_assignments.user_id) AND (p.coach_id = (select auth.uid()))))));
ALTER POLICY "Athletes can update own assignments" ON public.training_assignments USING ((user_id = (select auth.uid())));
ALTER POLICY "Coaches can update athlete assignments" ON public.training_assignments USING ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = training_assignments.user_id) AND (p.coach_id = (select auth.uid()))))));
ALTER POLICY "Admins can do everything on trainings" ON public.trainings USING (is_admin((select auth.uid())));
ALTER POLICY "Coaches can insert own trainings" ON public.trainings WITH CHECK (((select auth.uid()) = coach_id));
ALTER POLICY "Team staff can insert trainings" ON public.trainings WITH CHECK ((is_team_staff() AND (team_id = get_my_team_id()) AND (created_by = (select auth.uid()))));
ALTER POLICY "Athletes can read assigned trainings" ON public.trainings USING ((EXISTS ( SELECT 1
   FROM training_assignments ta
  WHERE ((ta.training_id = trainings.id) AND (ta.user_id = (select auth.uid()))))));
ALTER POLICY "Coaches can read own trainings" ON public.trainings USING (((select auth.uid()) = coach_id));
