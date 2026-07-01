import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase/api-helpers';
import { createServiceRoleClient } from '@/lib/supabase/server';
import * as Sentry from '@sentry/nextjs';
import { createRequestLogger, withRequestId } from '@/lib/logger';
import { apiError } from '@/lib/api/error-response';

interface SubscriptionRequestBody {
  endpoint?: string;
  keys?: { p256dh?: string; auth?: string };
}

export async function POST(request: NextRequest) {
  const { requestId, logger } = createRequestLogger('/api/v2/notifications/push-subscriptions', request);
  const respond = (body: unknown, init?: ResponseInit) =>
    NextResponse.json(body, withRequestId(init, requestId));

  try {
    const authResult = await requireAuth();
    if (authResult.response) {
      authResult.response.headers.set('x-request-id', requestId);
      return authResult.response;
    }

    const { user } = authResult;
    const payload = (await request.json()) as SubscriptionRequestBody;
    const endpoint = payload.endpoint;
    const p256dh = payload.keys?.p256dh;
    const auth = payload.keys?.auth;

    if (!endpoint || !p256dh || !auth) {
      return respond(apiError('VALIDATION_INVALID_SUBSCRIPTION', 'Missing subscription endpoint or keys'), { status: 400 });
    }

    const serviceSupabase = createServiceRoleClient();
    const { error } = await serviceSupabase
      .from('push_subscriptions')
      .upsert(
        { user_id: user!.id, endpoint, p256dh, auth },
        { onConflict: 'endpoint' }
      );

    if (error) {
      logger.error('push_subscriptions.create_failed', { error, userId: user!.id });
      return respond(apiError('PUSH_SUBSCRIPTION_SAVE_FAILED', 'Failed to save push subscription'), { status: 500 });
    }

    return respond({ success: true }, { status: 201 });
  } catch (error: unknown) {
    logger.error('push_subscriptions.unhandled_error', { error });
    Sentry.captureException(error, { tags: { route: '/api/v2/notifications/push-subscriptions', requestId } });
    return respond(apiError('INTERNAL_SERVER_ERROR'), { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const { requestId, logger } = createRequestLogger('/api/v2/notifications/push-subscriptions', request);
  const respond = (body: unknown, init?: ResponseInit) =>
    NextResponse.json(body, withRequestId(init, requestId));

  try {
    const authResult = await requireAuth();
    if (authResult.response) {
      authResult.response.headers.set('x-request-id', requestId);
      return authResult.response;
    }

    const { user } = authResult;
    const endpoint = new URL(request.url).searchParams.get('endpoint');

    if (!endpoint) {
      return respond(apiError('VALIDATION_ENDPOINT_REQUIRED', 'Missing endpoint query param'), { status: 400 });
    }

    const serviceSupabase = createServiceRoleClient();
    const { error } = await serviceSupabase
      .from('push_subscriptions')
      .delete()
      .eq('user_id', user!.id)
      .eq('endpoint', endpoint);

    if (error) {
      logger.error('push_subscriptions.delete_failed', { error, userId: user!.id });
      return respond(apiError('PUSH_SUBSCRIPTION_DELETE_FAILED', 'Failed to delete push subscription'), { status: 500 });
    }

    return respond({ success: true });
  } catch (error: unknown) {
    logger.error('push_subscriptions.unhandled_error', { error });
    Sentry.captureException(error, { tags: { route: '/api/v2/notifications/push-subscriptions', requestId } });
    return respond(apiError('INTERNAL_SERVER_ERROR'), { status: 500 });
  }
}
