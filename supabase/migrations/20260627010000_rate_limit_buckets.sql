-- Shared rate limit store so limits are enforced across all serverless
-- instances instead of per-process in-memory state.
create table if not exists rate_limit_buckets (
  key text primary key,
  count integer not null default 0,
  reset_at timestamptz not null,
  updated_at timestamptz not null default now()
);

-- Service role only; never exposed to anon/authenticated roles.
alter table rate_limit_buckets enable row level security;

create or replace function consume_rate_limit(
  p_key text,
  p_limit integer,
  p_window_ms integer
)
returns table (
  allowed boolean,
  limit_value integer,
  remaining integer,
  reset_at timestamptz,
  retry_after_seconds integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_existing rate_limit_buckets;
  v_reset_at timestamptz;
  v_count integer;
begin
  select * into v_existing from rate_limit_buckets where key = p_key for update;

  if v_existing.key is null or v_existing.reset_at <= v_now then
    v_reset_at := v_now + (p_window_ms * interval '1 millisecond');
    v_count := 1;

    insert into rate_limit_buckets (key, count, reset_at, updated_at)
    values (p_key, v_count, v_reset_at, v_now)
    on conflict (key) do update
      set count = v_count, reset_at = v_reset_at, updated_at = v_now;
  else
    v_count := v_existing.count + 1;
    v_reset_at := v_existing.reset_at;

    update rate_limit_buckets
      set count = v_count, updated_at = v_now
      where key = p_key;
  end if;

  return query select
    (v_count <= p_limit) as allowed,
    p_limit as limit_value,
    greatest(0, p_limit - v_count) as remaining,
    v_reset_at as reset_at,
    greatest(1, ceil(extract(epoch from (v_reset_at - v_now))))::integer as retry_after_seconds;
end;
$$;

-- Periodically reclaim expired buckets so the table doesn't grow unbounded.
create or replace function purge_expired_rate_limit_buckets()
returns void
language sql
security definer
set search_path = public
as $$
  delete from rate_limit_buckets where reset_at < now() - interval '1 hour';
$$;
