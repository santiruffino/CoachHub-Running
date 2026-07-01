import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase/api-helpers';
import { createServiceRoleClient } from '@/lib/supabase/server';
import * as Sentry from '@sentry/nextjs';
import { createRequestLogger, withRequestId } from '@/lib/logger';
import { apiError } from '@/lib/api/error-response';

const DEFAULT_LIMIT = 30;

export async function GET(request: NextRequest) {
  const { requestId, logger } = createRequestLogger('/api/v2/notifications', request);
  const respond = (body: unknown, init?: ResponseInit) =>
    NextResponse.json(body, withRequestId(init, requestId));

  try {
    const authResult = await requireAuth();
    if (authResult.response) {
      authResult.response.headers.set('x-request-id', requestId);
      return authResult.response;
    }

    const { user } = authResult;
    const serviceSupabase = createServiceRoleClient();

    const limitParam = Number(new URL(request.url).searchParams.get('limit'));
    const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 100) : DEFAULT_LIMIT;

    const [{ data: notifications, error: listError }, { count: unreadCount, error: countError }] = await Promise.all([
      serviceSupabase
        .from('notifications')
        .select('id, type, title, body, link, is_read, created_at')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(limit),
      serviceSupabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user!.id)
        .eq('is_read', false),
    ]);

    if (listError || countError) {
      logger.error('notifications.list_failed', { error: listError || countError, userId: user!.id });
      return respond(apiError('NOTIFICATIONS_LOAD_FAILED', 'Failed to load notifications'), { status: 500 });
    }

    return respond({
      notifications: notifications || [],
      unreadCount: unreadCount || 0,
    });
  } catch (error: unknown) {
    logger.error('notifications.unhandled_error', { error });
    Sentry.captureException(error, { tags: { route: '/api/v2/notifications', requestId } });
    return respond(apiError('INTERNAL_SERVER_ERROR'), { status: 500 });
  }
}
