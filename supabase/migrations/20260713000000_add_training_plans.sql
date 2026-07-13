-- Periodization: reusable multi-week training plans (mesocycles).
--
-- A `training_plan` is a template composed of `training_plan_items`, each of which
-- references an existing workout template (`trainings`) positioned on a week grid at
-- (week_index, day_of_week). Applying a plan materializes `training_assignments`
-- (handled in the app layer, reusing the existing snapshot/notify/garmin-push flow).

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.training_plans (
    id uuid primary key default uuid_generate_v4(),
    coach_id uuid not null references public.profiles (id) on delete cascade,
    team_id uuid references public.teams (id) on delete set null,
    created_by uuid references public.profiles (id) on delete set null,
    name text not null,
    description text,
    type public.training_type not null default 'RUNNING',
    duration_weeks integer not null default 1 check (duration_weeks >= 1 and duration_weeks <= 52),
    focus text,
    is_archived boolean not null default false,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

comment on table public.training_plans is 'Reusable multi-week training plan (mesocycle) templates.';

create table if not exists public.training_plan_items (
    id uuid primary key default uuid_generate_v4(),
    plan_id uuid not null references public.training_plans (id) on delete cascade,
    training_id uuid not null references public.trainings (id) on delete cascade,
    week_index integer not null check (week_index >= 0),
    day_of_week integer not null check (day_of_week between 0 and 6), -- 0 = Monday ... 6 = Sunday
    workout_name text,
    expected_rpe integer check (expected_rpe between 1 and 10),
    sort_order integer not null default 0,
    created_at timestamptz not null default now()
);

comment on column public.training_plan_items.day_of_week is '0 = Monday ... 6 = Sunday (matches CALENDAR_WEEK_START).';

create index if not exists idx_training_plans_team on public.training_plans (team_id) where is_archived = false;
create index if not exists idx_training_plan_items_plan on public.training_plan_items (plan_id, week_index, day_of_week, sort_order);
create index if not exists idx_training_plan_items_training on public.training_plan_items (training_id);

-- Keep updated_at fresh on plan writes (reuse existing trigger fn if present).
drop trigger if exists set_training_plans_updated_at on public.training_plans;
create trigger set_training_plans_updated_at
    before update on public.training_plans
    for each row execute function public.handle_updated_at();

-- ---------------------------------------------------------------------------
-- RLS — mirror the `trainings` policies (team-staff scoped + admin override)
-- ---------------------------------------------------------------------------

alter table public.training_plans enable row level security;
alter table public.training_plan_items enable row level security;

-- training_plans -----------------------------------------------------------
drop policy if exists "Admins can do everything on training_plans" on public.training_plans;
create policy "Admins can do everything on training_plans"
    on public.training_plans for all
    using (is_admin(auth.uid()));

drop policy if exists "Team staff can view team plans" on public.training_plans;
create policy "Team staff can view team plans"
    on public.training_plans for select
    using (is_team_staff() and team_id = get_my_team_id());

drop policy if exists "Team staff can insert plans" on public.training_plans;
create policy "Team staff can insert plans"
    on public.training_plans for insert
    with check (is_team_staff() and team_id = get_my_team_id() and created_by = auth.uid());

drop policy if exists "Team staff can update team plans" on public.training_plans;
create policy "Team staff can update team plans"
    on public.training_plans for update
    using (is_team_staff() and team_id = get_my_team_id())
    with check (team_id = get_my_team_id());

drop policy if exists "Team staff can delete team plans" on public.training_plans;
create policy "Team staff can delete team plans"
    on public.training_plans for delete
    using (is_team_staff() and team_id = get_my_team_id());

-- training_plan_items ------------------------------------------------------
drop policy if exists "Admins can do everything on training_plan_items" on public.training_plan_items;
create policy "Admins can do everything on training_plan_items"
    on public.training_plan_items for all
    using (is_admin(auth.uid()));

drop policy if exists "Team staff can view plan items" on public.training_plan_items;
create policy "Team staff can view plan items"
    on public.training_plan_items for select
    using (exists (
        select 1 from public.training_plans p
        where p.id = training_plan_items.plan_id
          and is_team_staff()
          and p.team_id = get_my_team_id()
    ));

drop policy if exists "Team staff can insert plan items" on public.training_plan_items;
create policy "Team staff can insert plan items"
    on public.training_plan_items for insert
    with check (exists (
        select 1 from public.training_plans p
        where p.id = training_plan_items.plan_id
          and is_team_staff()
          and p.team_id = get_my_team_id()
    ));

drop policy if exists "Team staff can update plan items" on public.training_plan_items;
create policy "Team staff can update plan items"
    on public.training_plan_items for update
    using (exists (
        select 1 from public.training_plans p
        where p.id = training_plan_items.plan_id
          and is_team_staff()
          and p.team_id = get_my_team_id()
    ));

drop policy if exists "Team staff can delete plan items" on public.training_plan_items;
create policy "Team staff can delete plan items"
    on public.training_plan_items for delete
    using (exists (
        select 1 from public.training_plans p
        where p.id = training_plan_items.plan_id
          and is_team_staff()
          and p.team_id = get_my_team_id()
    ));
