alter table public.athlete_profiles
add column if not exists lthr integer;

comment on column public.athlete_profiles.lthr is 'Lactate Threshold Heart Rate (bpm)';
