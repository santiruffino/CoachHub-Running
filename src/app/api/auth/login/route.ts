import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { buildRateLimitKey, consumeRateLimit, getClientIpFromHeaders } from '@/lib/api/rate-limit';
import { apiError } from '@/lib/api/error-response';
import { loginSchema, validateBody } from '@/lib/validation/schemas';
import { reportApiError } from '@/lib/api/report-error';

const LOGIN_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_RATE_LIMIT_MAX_REQUESTS = 5;

export async function POST(request: NextRequest) {
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
      return NextResponse.json(
        { error: error.message },
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
      return NextResponse.json(
        { error: 'Failed to fetch user profile' },
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
    reportApiError(error, { route: '/api/auth/login', method: 'POST' });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
