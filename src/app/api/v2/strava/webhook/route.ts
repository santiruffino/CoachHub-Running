import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import * as Sentry from '@sentry/nextjs';
import { createRequestLogger, withRequestId } from '@/lib/logger';

interface StravaWebhookPayload {
  subscription_id?: number | string;
  object_type?: string;
  object_id?: number;
  aspect_type?: string;
  owner_id?: number;
  updates?: Record<string, unknown>;
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
    const payload = (await req.json()) as StravaWebhookPayload;

    if (!payload || typeof payload !== 'object') {
      logger.warn('strava_webhook.invalid_payload');
      return respond({ error: 'Invalid webhook payload' }, { status: 400 });
    }
    
    // 1. Validate subscription_id if configured
    const expectedSubId = process.env.STRAVA_SUBSCRIPTION_ID;
    const incomingSubId = payload.subscription_id?.toString();
    if (expectedSubId && incomingSubId !== expectedSubId) {
      logger.warn('strava_webhook.invalid_subscription_id', { incomingSubId });
      return respond({ error: 'Invalid subscription ID' }, { status: 401 });
    }

    const sharedSecret = process.env.STRAVA_WEBHOOK_SHARED_SECRET;
    if (!sharedSecret) {
      logger.error('strava_webhook.shared_secret_missing');
      return respond({ error: 'Webhook configuration error' }, { status: 500 });
    }

    const supabase = createServiceRoleClient();

    // 2. Log the incoming webhook to webhook_logs
    await supabase.from('webhook_logs').insert({
      source: 'strava',
      payload: payload,
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
    return respond({ error: 'Internal Server Error' }, { status: 500 });
  }
}
