-- Add FTP (Functional Threshold Power) to athlete profiles.
-- FTP is the cycling analogue of VAM/LTHR and is required for power-based
-- cycling workouts (power_zone / ftp_percent targets) to resolve to real watts
-- in the workout builder and Garmin push. Nullable: only cyclists set it.
alter table public.athlete_profiles
add column if not exists ftp integer;

comment on column public.athlete_profiles.ftp is 'Functional Threshold Power (watts) — cycling';
