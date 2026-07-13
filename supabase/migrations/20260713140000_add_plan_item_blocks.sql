-- Per-slot workout structure override for plan items.
--
-- A plan item references a workout template (`training_id`) as its base. This
-- optional `blocks` column lets a coach tweak the structure for that specific
-- slot (e.g. 600m repeats one week, 800m the next) without creating a separate
-- template. When NULL, the slot follows the live template's blocks; when set,
-- the override is used on apply / copy.
alter table public.training_plan_items
    add column if not exists blocks jsonb;

comment on column public.training_plan_items.blocks is
    'Optional per-slot workout structure override. NULL = use the referenced training template blocks.';
