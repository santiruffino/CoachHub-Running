import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { sendWishlistNotificationEmail } from '@/lib/email/send';
import { upsertWishlistContact } from '@/lib/hubspot/upsert-wishlist-contact';
import { WishlistTeamSize } from '@/lib/email/templates/wishlist-notification';
import { buildRateLimitKey, consumeRateLimit, getClientIpFromHeaders } from '@/lib/api/rate-limit';
import { apiError } from '@/lib/api/error-response';
import { z } from 'zod';
import { wishlistSchema, validateBody } from '@/lib/validation/schemas';
import { reportApiError } from '@/lib/api/report-error';
import { createRequestLogger } from '@/lib/logger';

const WISHLIST_RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const WISHLIST_RATE_LIMIT_MAX_REQUESTS = 10;

function sanitize(value: string, max: number): string {
    return value.replace(/\s+/g, ' ').trim().slice(0, max);
}

export async function POST(request: NextRequest) {
  const { requestId, logger } = createRequestLogger('/api/wishlist', request);
  const clientIp = getClientIpFromHeaders(request.headers);
  const rateLimitKey = buildRateLimitKey('/api/wishlist', clientIp, null);
  const rateLimit = await consumeRateLimit({
    key: rateLimitKey,
    limit: WISHLIST_RATE_LIMIT_MAX_REQUESTS,
    windowMs: WISHLIST_RATE_LIMIT_WINDOW_MS,
  });

  const headers = new Headers();
  headers.set('x-ratelimit-limit', String(rateLimit.limit));
  headers.set('x-ratelimit-remaining', String(rateLimit.remaining));
  headers.set('x-ratelimit-reset', String(Math.floor(rateLimit.resetAt / 1000)));
  headers.set('retry-after', String(rateLimit.retryAfterSeconds));

  if (!rateLimit.allowed) {
    return NextResponse.json(apiError('RATE_LIMIT_EXCEEDED'), {
      status: 429,
      headers,
    });
  }

  let body: z.infer<typeof wishlistSchema>;
  try {
      const rawBody = await request.json();
      const { data, error } = validateBody(wishlistSchema, rawBody);
      if (error) {
          return NextResponse.json(
              apiError('VALIDATION_ERROR', error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')),
              { status: 400, headers },
          );
      }
      body = data!;
  } catch {
      return NextResponse.json(
          apiError('INVALID_JSON', 'Invalid JSON body.'),
          { status: 400, headers },
      );
  }

  const { name, email, teamName, teamSize, locale } = body;
  const sanitizedName = sanitize(name, 120);
  const sanitizedEmail = sanitize(email, 254).toLowerCase();
  const sanitizedTeamName = sanitize(teamName, 120);
  const sanitizedLocale = locale ? locale.slice(0, 8) : null;

  const userAgent = request.headers.get('user-agent')?.slice(0, 500) ?? null;

  const supabase = createServiceRoleClient();

  const { data: inserted, error } = await supabase
      .from('wishlist_signups')
      .insert({
          name: sanitizedName,
          email: sanitizedEmail,
          team_name: sanitizedTeamName,
          team_size: teamSize as WishlistTeamSize,
          locale: sanitizedLocale,
          user_agent: userAgent,
      })
      .select('id, created_at')
      .single();

  if (error) {
      // Supabase unique violation code on email column
      if (error.code === '23505') {
          return NextResponse.json(
              { error: 'ALREADY_REGISTERED', message: 'Email already on the wishlist.' },
              { status: 409, headers },
          );
      }

      logger.error('wishlist.insert_failed', { error });
      return NextResponse.json(
          { error: 'INTERNAL_ERROR', message: 'Could not save signup.' },
          { status: 500, headers },
      );
  }

  // Best-effort side effects — the signup is already persisted, so neither the
  // notification email nor the HubSpot CRM sync should fail the request if their
  // provider is down or unconfigured. Run them in parallel.
  const [emailResult, hubspotResult] = await Promise.allSettled([
      sendWishlistNotificationEmail({
          name: sanitizedName,
          email: sanitizedEmail,
          teamName: sanitizedTeamName,
          teamSize: teamSize as WishlistTeamSize,
          locale: sanitizedLocale,
          userAgent,
          createdAt: inserted?.created_at ? new Date(inserted.created_at) : new Date(),
          signupId: inserted?.id,
      }),
      upsertWishlistContact({
          name: sanitizedName,
          email: sanitizedEmail,
          teamName: sanitizedTeamName,
          teamSize: teamSize as WishlistTeamSize,
      }),
  ]);

  if (emailResult.status === 'rejected') {
      reportApiError(emailResult.reason, {
          route: '/api/wishlist',
          method: 'POST',
          requestId,
          logger,
          extra: { email, stage: 'email' },
      });
  }

  if (hubspotResult.status === 'rejected') {
      // upsertWishlistContact never throws, but guard defensively.
      reportApiError(hubspotResult.reason, {
          route: '/api/wishlist',
          method: 'POST',
          requestId,
          logger,
          extra: { email, stage: 'hubspot' },
      });
  }

  return NextResponse.json({ success: true }, { status: 201, headers });
}
