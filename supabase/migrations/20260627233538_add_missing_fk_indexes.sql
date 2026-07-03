-- Add covering indexes for foreign keys flagged by the Supabase performance
-- advisor as unindexed. These tables are tiny today, but every one of these
-- columns is used in joins or RLS policy lookups (notably team_id, the
-- multi-tenant boundary), so missing indexes would force full table scans
-- as soon as row counts grow with new teams/athletes.

create index if not exists idx_activity_backfill_jobs_requested_by on public.activity_backfill_jobs (requested_by);
create index if not exists idx_activity_compliance_assignment_id on public.activity_compliance (assignment_id);
create index if not exists idx_alerts_activity_id on public.alerts (activity_id);
create index if not exists idx_athlete_gear_user_id on public.athlete_gear (user_id);
create index if not exists idx_athlete_groups_group_id on public.athlete_groups (group_id);
create index if not exists idx_athlete_metrics_athlete_profile_id on public.athlete_metrics (athlete_profile_id);
create index if not exists idx_athlete_races_athlete_id on public.athlete_races (athlete_id);
create index if not exists idx_athlete_races_race_id on public.athlete_races (race_id);
create index if not exists idx_coach_athlete_messages_coach_id on public.coach_athlete_messages (coach_id);
create index if not exists idx_coach_settings_updated_by on public.coach_settings (updated_by);
create index if not exists idx_groups_coach_id on public.groups (coach_id);
create index if not exists idx_groups_team_id on public.groups (team_id);
create index if not exists idx_invitations_coach_id on public.invitations (coach_id);
create index if not exists idx_invitations_team_id on public.invitations (team_id);
create index if not exists idx_profiles_team_id on public.profiles (team_id);
create index if not exists idx_races_coach_id on public.races (coach_id);
create index if not exists idx_races_team_id on public.races (team_id);
create index if not exists idx_running_teams_owner_id on public.running_teams (owner_id);
create index if not exists idx_team_invite_links_created_by on public.team_invite_links (created_by);
create index if not exists idx_team_settings_updated_by on public.team_settings (updated_by);
create index if not exists idx_training_assignments_activity_id on public.training_assignments (activity_id);
create index if not exists idx_training_assignments_source_group_id on public.training_assignments (source_group_id);
create index if not exists idx_training_assignments_training_id on public.training_assignments (training_id);
create index if not exists idx_trainings_coach_id on public.trainings (coach_id);
