type RateLimitRecord = {
  count: number;
  resetAt: number;
};

type RateLimitBucket = {
  map: Map<string, RateLimitRecord>;
};

type RateLimitOptions = {
  key: string;
  limit: number;
  windowMs: number;
  now?: number;
};

type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
};

declare global {
  var __coachHubRateLimitStore: RateLimitBucket | undefined;
}

function getStore(): RateLimitBucket {
  if (!globalThis.__coachHubRateLimitStore) {
    globalThis.__coachHubRateLimitStore = {
      map: new Map<string, RateLimitRecord>(),
    };
  }

  return globalThis.__coachHubRateLimitStore;
}

export function consumeRateLimit(options: RateLimitOptions): RateLimitResult {
  const now = options.now ?? Date.now();
  const store = getStore();
  const existing = store.map.get(options.key);

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + options.windowMs;
    store.map.set(options.key, { count: 1, resetAt });

    return {
      allowed: true,
      limit: options.limit,
      remaining: Math.max(0, options.limit - 1),
      resetAt,
      retryAfterSeconds: Math.max(1, Math.ceil(options.windowMs / 1000)),
    };
  }

  existing.count += 1;
  store.map.set(options.key, existing);

  const remaining = Math.max(0, options.limit - existing.count);
  const retryAfterSeconds = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));

  return {
    allowed: existing.count <= options.limit,
    limit: options.limit,
    remaining,
    resetAt: existing.resetAt,
    retryAfterSeconds,
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
