import { updateSession } from '@/lib/supabase/middleware';
import { apiError } from '@/lib/api/error-response';
import { buildRateLimitKey, consumeRateLimit, getClientIpFromHeaders } from '@/lib/api/rate-limit';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const API_RATE_LIMIT_WINDOW_MS = Number.parseInt(process.env.API_RATE_LIMIT_WINDOW_MS || '60000', 10);
const API_RATE_LIMIT_MAX_REQUESTS = Number.parseInt(process.env.API_RATE_LIMIT_MAX_REQUESTS || '120', 10);

export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/api/v2/')) {
    const clientIp = getClientIpFromHeaders(request.headers);
    const key = buildRateLimitKey(request.nextUrl.pathname, clientIp, null);
    const result = await consumeRateLimit({
      key,
      limit: API_RATE_LIMIT_MAX_REQUESTS,
      windowMs: API_RATE_LIMIT_WINDOW_MS,
    });

    if (!result.allowed) {
      return NextResponse.json(apiError('RATE_LIMIT_EXCEEDED', 'Too many requests'), {
        status: 429,
        headers: {
          'x-ratelimit-limit': String(result.limit),
          'x-ratelimit-remaining': String(result.remaining),
          'x-ratelimit-reset': String(Math.floor(result.resetAt / 1000)),
          'retry-after': String(result.retryAfterSeconds),
        },
      });
    }
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - auth related paths
     * - forgot-password (public password reset request page)
     * - reset-password (public password reset form page)
     * - robots.txt / sitemap.xml / opengraph-image (public SEO metadata routes
     *   fetched by unauthenticated crawlers and social scrapers)
     * - google*.html (Google Search Console site-verification files, fetched
     *   unauthenticated by Google)
     * - api/wishlist (public landing-page signup endpoint, called by anonymous
     *   visitors; has its own rate limiting inside the route handler)
     */
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|manifest.webmanifest|sw.js|robots.txt|sitemap.xml|opengraph-image|google[a-z0-9]+\\.html|reset-password|forgot-password|auth|api/auth|api/wishlist|api/v2/strava/webhook|accept-invitation|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
