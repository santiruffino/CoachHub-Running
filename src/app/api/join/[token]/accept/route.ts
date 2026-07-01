import { NextRequest, NextResponse } from 'next/server';
import { createRequestLogger } from '@/lib/logger';
import { apiError } from '@/lib/api/error-response';
import { reportApiError } from '@/lib/api/report-error';
import { buildRateLimitKey, consumeRateLimit, getClientIpFromHeaders } from '@/lib/api/rate-limit';
import { z } from 'zod';
import { acceptInviteSchema, validateBody } from '@/lib/validation/schemas';
import { acceptTeamInviteLink } from '@/lib/invitations/accept-team-invite';

const ACCEPT_INVITE_RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const ACCEPT_INVITE_RATE_LIMIT_MAX_REQUESTS = 10;

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ token: string }> }
) {
    const { requestId, logger } = createRequestLogger('/api/join/[token]/accept', request);
    const clientIp = getClientIpFromHeaders(request.headers);
    const rateLimitKey = buildRateLimitKey('/api/join/[token]/accept', clientIp, null);
    const rateLimit = await consumeRateLimit({
        key: rateLimitKey,
        limit: ACCEPT_INVITE_RATE_LIMIT_MAX_REQUESTS,
        windowMs: ACCEPT_INVITE_RATE_LIMIT_WINDOW_MS,
    });

    const headers = new Headers();
    headers.set('x-ratelimit-limit', String(rateLimit.limit));
    headers.set('x-ratelimit-remaining', String(rateLimit.remaining));
    headers.set('x-ratelimit-reset', String(Math.floor(rateLimit.resetAt / 1000)));
    headers.set('retry-after', String(rateLimit.retryAfterSeconds));

    try {
        const { token } = await params;
        if (!token || typeof token !== 'string' || token.length < 16) {
            return NextResponse.json(apiError('INVALID_LINK', 'Invalid invite link.'), { status: 400, headers });
        }

        if (!rateLimit.allowed) {
            return NextResponse.json(apiError('RATE_LIMIT_EXCEEDED'), {
                status: 429,
                headers,
            });
        }

        let body: z.infer<typeof acceptInviteSchema>;
        try {
            const rawBody = await request.json();
            const { data, error } = validateBody(acceptInviteSchema, rawBody);
            if (error) {
                return NextResponse.json(
                    apiError('VALIDATION_ERROR', error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')),
                    { status: 400, headers }
                );
            }
            body = data!;
        } catch {
            return NextResponse.json(apiError('INVALID_BODY', 'Invalid request body.'), { status: 400, headers });
        }

        const email = body.email.trim().toLowerCase();
        const name = body.name.trim();
        const password = body.password;

        const result = await acceptTeamInviteLink({ token, email, name, password, logger });

        if (!result.ok) {
            return NextResponse.json(apiError(result.code, result.message), { status: result.status, headers });
        }

        return NextResponse.json({ success: true, email: result.email }, { headers });
    } catch (error: unknown) {
        reportApiError(error, { route: '/api/join/[token]/accept', method: 'POST', requestId, logger, extra: { event: 'join.accept_unexpected' } });
        return NextResponse.json(apiError('INTERNAL_ERROR'), { status: 500, headers });
    }
}
