-- The CREATE OR REPLACE FUNCTION in 20260627030000 added a default param
-- (p_email), which Postgres treats as a new overload rather than a
-- replacement of the single-arg version. Drop the old one so there's a
-- single, email-aware implementation and no ambiguity about which version
-- a caller hits.
drop function if exists public.consume_team_invite_link(text);
