import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase/api-helpers';
import { createServiceRoleClient } from '@/lib/supabase/server';
import * as Sentry from '@sentry/nextjs';
import { createRequestLogger, withRequestId } from '@/lib/logger';
import { apiError } from '@/lib/api/error-response';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { requestId, logger } = createRequestLogger('/api/v2/notifications/[id]/read', request);
  const respond = (body: unknown, init?: ResponseInit) =>
    NextResponse.json(body, withRequestId(init, requestId));

  try {
    const authResult = await requireAuth();
    if (authResult.response) {
      authResult.response.headers.set('x-request-id', requestId);
      return authResult.response;
    }

    const { user } = authResult;
    const { id } = await params;
    const serviceSupabase = createServiceRoleClient();

    const { error } = await serviceSupabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id)
      .eq('user_id', user!.id);

    if (error) {
      logger.error('notifications.read_failed', { error, userId: user!.id, notificationId: id });
      return respond(apiError('NOTIFICATION_READ_FAILED', 'Failed to mark notification as read'), { status: 500 });
    }

    return respond({ success: true });
  } catch (error: unknown) {
    logger.error('notifications.unhandled_error', { error });
    Sentry.captureException(error, { tags: { route: '/api/v2/notifications/[id]/read', requestId } });
    return respond(apiError('INTERNAL_SERVER_ERROR'), { status: 500 });
  }
}
