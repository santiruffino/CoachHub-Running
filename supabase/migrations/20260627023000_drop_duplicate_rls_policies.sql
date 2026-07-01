-- Remove literally duplicate permissive RLS policies (same table, same
-- command, same predicate just written with operands swapped). These were
-- found while investigating "multiple_permissive_policies" performance
-- advisor findings: Postgres evaluates every permissive policy that applies
-- to a query, so each duplicate is pure wasted work with zero behavior
-- change once removed (the remaining policy covers the exact same rows).

-- "Athletes can read own group memberships" (auth.uid() = athlete_id) duplicates
-- "Athletes can view own group memberships" (athlete_id = auth.uid()).
drop policy if exists "Athletes can view own group memberships" on public.athlete_groups;

-- "Athletes can read own assignments" (auth.uid() = user_id) duplicates
-- "Athletes can view own assignments" (user_id = auth.uid()).
drop policy if exists "Athletes can view own assignments" on public.training_assignments;
