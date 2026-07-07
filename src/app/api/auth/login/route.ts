import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { buildRateLimitKey, consumeRateLimit, getClientIpFromHeaders } from '@/lib/api/rate-limit';
import { apiError } from '@/lib/api/error-response';
import { loginSchema, validateBody } from '@/lib/validation/schemas';
import { reportApiError } from '@/lib/api/report-error';
import { createRequestLogger } from '@/lib/logger';

const LOGIN_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_RATE_LIMIT_MAX_REQUESTS = 5;

export async function POST(request: NextRequest) {
  const { requestId, logger } = createRequestLogger('/api/auth/login', request);
  try {
    const clientIp = getClientIpFromHeaders(request.headers);
    const rateLimitKey = buildRateLimitKey('/api/auth/login', clientIp, null);
    const rateLimit = await consumeRateLimit({
      key: rateLimitKey,
      limit: LOGIN_RATE_LIMIT_MAX_REQUESTS,
      windowMs: LOGIN_RATE_LIMIT_WINDOW_MS,
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

    let body: { email: string; password: string };
    try {
      const rawBody = await request.json();
      const { data, error } = validateBody(loginSchema, rawBody);
      if (error) {
        return NextResponse.json(
          apiError('VALIDATION_ERROR', error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')),
          { status: 400, headers }
        );
      }
      body = data!;
    } catch {
      return NextResponse.json(
        apiError('INVALID_JSON', 'Invalid JSON body'),
        { status: 400, headers }
      );
    }

    const { email, password } = body;

    const supabase = await createClient();

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      logger.warn('login.auth_failed', { message: error.message });
      return NextResponse.json(
        apiError('AUTH_INVALID_CREDENTIALS', 'Invalid email or password'),
        { status: 401, headers }
      );
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (profileError) {
      logger.error('login.profile_fetch_failed', { error: profileError });
      return NextResponse.json(
        apiError('PROFILE_FETCH_FAILED', 'Failed to fetch user profile'),
        { status: 500, headers }
      );
    }


    return NextResponse.json({
      user: {
        id: data.user.id,
        email: data.user.email,
        name: profile.name,
        role: profile.role,
        mustChangePassword: profile.must_change_password,
      },
      token: data.session?.access_token, // For backward compatibility
    }, { headers });
  } catch (error: unknown) {
    reportApiError(error, { route: '/api/auth/login', method: 'POST', requestId, logger });
    return NextResponse.json(apiError('INTERNAL_SERVER_ERROR'), { status: 500 });
  }
}
