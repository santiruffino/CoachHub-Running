import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import * as Sentry from '@sentry/nextjs';
import { createRequestLogger, withRequestId } from '@/lib/logger';
import { apiError } from '@/lib/api/error-response';
import { buildRateLimitKey, consumeRateLimit, getClientIpFromHeaders } from '@/lib/api/rate-limit';

interface StravaWebhookPayload {
  subscription_id?: number | string;
  object_type?: string;
  object_id?: number;
  aspect_type?: string;
  owner_id?: number;
  updates?: Record<string, unknown>;
}

const MAX_WEBHOOK_BODY_BYTES = 64 * 1024;
const WEBHOOK_RATE_LIMIT_WINDOW_MS = Number.parseInt(process.env.STRAVA_WEBHOOK_RATE_LIMIT_WINDOW_MS || '60000', 10);
const WEBHOOK_RATE_LIMIT_MAX_REQUESTS = Number.parseInt(process.env.STRAVA_WEBHOOK_RATE_LIMIT_MAX_REQUESTS || '60', 10);

function isValidWebhookPayload(payload: StravaWebhookPayload): boolean {
  if (!payload || typeof payload !== 'object') {
    return false;
  }

  const objectTypeValid = payload.object_type === 'activity' || payload.object_type === 'athlete';
  const aspectTypeValid = payload.aspect_type === 'create' || payload.aspect_type === 'update' || payload.aspect_type === 'delete';

  return objectTypeValid && aspectTypeValid && typeof payload.object_id === 'number' && typeof payload.owner_id === 'number';
}

/**
 * Strava Webhook Handler (SAN-26)
 * - GET: Handshake validation with hub.verify_token
 * - POST: Log event and trigger async processing via Edge Function
 */

export async function GET(req: NextRequest) {
  const { requestId, logger } = createRequestLogger('/api/v2/strava/webhook', req);
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const verifyToken = process.env.STRAVA_WEBHOOK_VERIFY_TOKEN;

  if (!verifyToken) {
    logger.error('strava_webhook.verify_token_missing');
    return new NextResponse('Forbidden', withRequestId({ status: 403 }, requestId));
  }

  if (mode === 'subscribe' && token === verifyToken && challenge) {
    logger.info('strava_webhook.handshake_accepted');
    return NextResponse.json({ 'hub.challenge': challenge }, withRequestId({ status: 200 }, requestId));
  }

  logger.warn('strava_webhook.handshake_rejected');
  return new NextResponse('Forbidden', withRequestId({ status: 403 }, requestId));
}

export async function POST(req: NextRequest) {
  const { requestId, logger } = createRequestLogger('/api/v2/strava/webhook', req);
  const respond = (body: unknown, init?: ResponseInit) =>
    NextResponse.json(body, withRequestId(init, requestId));

  const start = Date.now();
  
  try {
    const clientIp = getClientIpFromHeaders(req.headers);
    const rateLimitKey = buildRateLimitKey('/api/v2/strava/webhook', clientIp, null);
    const rateLimit = await consumeRateLimit({
      key: rateLimitKey,
      limit: WEBHOOK_RATE_LIMIT_MAX_REQUESTS,
      windowMs: WEBHOOK_RATE_LIMIT_WINDOW_MS,
    });
    if (!rateLimit.allowed) {
      logger.warn('strava_webhook.rate_limit_exceeded');
      return respond(apiError('RATE_LIMIT_EXCEEDED'), {
        status: 429,
        headers: {
          'x-ratelimit-limit': String(rateLimit.limit),
          'x-ratelimit-remaining': String(rateLimit.remaining),
          'x-ratelimit-reset': String(Math.floor(rateLimit.resetAt / 1000)),
          'retry-after': String(rateLimit.retryAfterSeconds),
        },
      });
    }

    const contentType = req.headers.get('content-type') || '';
    if (!contentType.toLowerCase().includes('application/json')) {
      logger.warn('strava_webhook.invalid_content_type');
      return respond(apiError('VALIDATION_INVALID_WEBHOOK_PAYLOAD'), { status: 400 });
    }

    const rawBody = await req.text();
    if (rawBody.length > MAX_WEBHOOK_BODY_BYTES) {
      logger.warn('strava_webhook.payload_too_large', { size: rawBody.length });
      return respond(apiError('VALIDATION_INVALID_WEBHOOK_PAYLOAD'), { status: 400 });
    }
    const sharedSecret = process.env.STRAVA_WEBHOOK_SHARED_SECRET;
    if (!sharedSecret) {
      logger.error('strava_webhook.shared_secret_missing');
      return respond(apiError('WEBHOOK_CONFIGURATION_ERROR'), { status: 500 });
    }

    let payload: StravaWebhookPayload;
    try {
      payload = JSON.parse(rawBody) as StravaWebhookPayload;
    } catch {
      logger.warn('strava_webhook.invalid_json');
      return respond(apiError('VALIDATION_INVALID_WEBHOOK_PAYLOAD'), { status: 400 });
    }

    if (!isValidWebhookPayload(payload)) {
      logger.warn('strava_webhook.invalid_payload');
      return respond(apiError('VALIDATION_INVALID_WEBHOOK_PAYLOAD'), { status: 400 });
    }
    
    // 1. Validate subscription_id (mandatory: Strava doesn't sign webhook payloads,
    // so this is our only check that the event matches our actual subscription)
    const expectedSubId = process.env.STRAVA_SUBSCRIPTION_ID;
    if (!expectedSubId) {
      logger.error('strava_webhook.subscription_id_not_configured');
      return respond(apiError('WEBHOOK_CONFIGURATION_ERROR'), { status: 500 });
    }
    const incomingSubId = payload.subscription_id?.toString();
    if (incomingSubId !== expectedSubId) {
      logger.warn('strava_webhook.invalid_subscription_id');
      return respond(apiError('INVALID_SUBSCRIPTION_ID'), { status: 401 });
    }

    const supabase = createServiceRoleClient();

    // 2. Log the incoming webhook to webhook_logs (Redact sensitive subscription_id)
    const logPayload = { ...payload };
    if (logPayload.subscription_id) {
      logPayload.subscription_id = '[REDACTED]';
    }

    await supabase.from('webhook_logs').insert({
      source: 'strava',
      payload: logPayload,
    });

    // 3. Trigger asynchronous processing via Supabase Edge Function
    // We AWAIT this call to ensure the connection is established and the function is triggered
    // in serverless environments. Fire-and-forget can lead to ECONNRESET if the runtime
    // terminates before the TLS handshake completes.
    logger.info('strava_webhook.trigger_processing');
    
    try {
      const { data: funcData, error: funcError } = await supabase.functions.invoke('process-strava-activity', {
        body: payload,
        headers: {
          'X-Webhook-Secret': sharedSecret,
        },
      });

        if (funcError) {
          logger.error('strava_webhook.edge_function_invoke_failed', { error: funcError });
        } else {
          logger.info('strava_webhook.edge_function_invoke_ok', { ok: !!funcData });
        }
    } catch (fetchErr) {
      logger.error('strava_webhook.edge_function_network_error', { error: fetchErr });
      Sentry.captureException(fetchErr, {
        tags: { route: '/api/v2/strava/webhook', requestId },
      });
    }

    logger.info('strava_webhook.processed', { durationMs: Date.now() - start });
    return respond({ status: 'ok' }, { status: 200 });
  } catch (error) {
    logger.error('strava_webhook.unhandled_error', { error });
    Sentry.captureException(error, {
      tags: { route: '/api/v2/strava/webhook', requestId },
    });
    return respond(apiError('INTERNAL_SERVER_ERROR'), { status: 500 });
  }
}
