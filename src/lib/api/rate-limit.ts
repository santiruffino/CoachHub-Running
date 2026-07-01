import { createServiceRoleClient } from '@/lib/supabase/server';
import { appLogger } from '@/lib/app-logger';

type RateLimitOptions = {
  key: string;
  limit: number;
  windowMs: number;
};

type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
};

interface ConsumeRateLimitRow {
  allowed: boolean;
  limit_value: number;
  remaining: number;
  reset_at: string;
  retry_after_seconds: number;
}

/**
 * Shared, cross-instance rate limiter backed by the `rate_limit_buckets`
 * table + `consume_rate_limit` RPC (see migration 20260627010000).
 *
 * Fails open on infrastructure errors (DB unreachable, etc.) so an outage
 * in the rate-limit store never blocks legitimate traffic; the error is
 * still logged so it's visible.
 */
export async function consumeRateLimit(options: RateLimitOptions): Promise<RateLimitResult> {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .rpc('consume_rate_limit', {
      p_key: options.key,
      p_limit: options.limit,
      p_window_ms: options.windowMs,
    })
    .single<ConsumeRateLimitRow>();

  if (error || !data) {
    appLogger.error('rate_limit.store_unavailable', { error, key: options.key });
    const resetAt = Date.now() + options.windowMs;
    return {
      allowed: true,
      limit: options.limit,
      remaining: options.limit,
      resetAt,
      retryAfterSeconds: Math.max(1, Math.ceil(options.windowMs / 1000)),
    };
  }

  return {
    allowed: data.allowed,
    limit: data.limit_value,
    remaining: data.remaining,
    resetAt: new Date(data.reset_at).getTime(),
    retryAfterSeconds: data.retry_after_seconds,
  };
}

export function buildRateLimitKey(pathname: string, ip: string | null, userId: string | null): string {
  if (userId) {
    return `user:${userId}:${pathname}`;
  }

  if (ip) {
    return `ip:${ip}:${pathname}`;
  }

  return `anon:${pathname}`;
}

export function getClientIpFromHeaders(headers: Headers): string | null {
  const forwardedFor = headers.get('x-forwarded-for');
  if (forwardedFor) {
    const firstIp = forwardedFor.split(',')[0]?.trim();
    if (firstIp) {
      return firstIp;
    }
  }

  const realIp = headers.get('x-real-ip')?.trim();
  return realIp || null;
}
