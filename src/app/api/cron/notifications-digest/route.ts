import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { sendPushToUser } from '@/lib/notifications/create-notification';
import { createRequestLogger, withRequestId } from '@/lib/logger';
import { apiError } from '@/lib/api/error-response';
import { secureCompare } from '@/lib/api/secure-compare';

const WINDOW_LOOKBACK_HOURS: Record<'daily' | 'weekly', number> = {
  daily: 24,
  weekly: 24 * 7,
};

/**
 * Batches push notifications for users whose category preference is `daily` or `weekly`
 * instead of `immediate`. Notifications themselves are always created right away (in-app
 * inbox stays real-time); this cron only catches up on the deferred push side, identified by
 * `push_sent_at IS NULL`. Triggered by Vercel Cron (see vercel.json) with `?window=daily|weekly`.
 */
export async function GET(request: NextRequest) {
  const { requestId, logger } = createRequestLogger('/api/cron/notifications-digest', request);
  const respond = (body: unknown, init?: ResponseInit) =>
    NextResponse.json(body, withRequestId(init, requestId));

  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');

  if (!cronSecret || !secureCompare(authHeader, `Bearer ${cronSecret}`)) {
    logger.warn('notifications_digest.unauthorized');
    return respond(apiError('AUTH_UNAUTHORIZED'), { status: 401 });
  }

  const window = request.nextUrl.searchParams.get('window');
  if (window !== 'daily' && window !== 'weekly') {
    return respond(apiError('VALIDATION_INVALID_WINDOW'), { status: 400 });
  }

  try {
    const supabase = createServiceRoleClient();
    const cutoff = new Date(Date.now() - WINDOW_LOOKBACK_HOURS[window] * 60 * 60 * 1000).toISOString();

    const { data: preferences } = await supabase
      .from('notification_preferences')
      .select('user_id, category')
      .eq('frequency', window)
      .eq('push_enabled', true);

    if (!preferences || preferences.length === 0) {
      return respond({ success: true, usersNotified: 0 });
    }

    const categoriesByUser = new Map<string, string[]>();
    preferences.forEach((pref) => {
      const list = categoriesByUser.get(pref.user_id) || [];
      list.push(pref.category);
      categoriesByUser.set(pref.user_id, list);
    });

    let usersNotified = 0;

    for (const [userId, categories] of categoriesByUser.entries()) {
      const { data: pending } = await supabase
        .from('notifications')
        .select('id, title')
        .eq('user_id', userId)
        .in('type', categories)
        .is('push_sent_at', null)
        .gte('created_at', cutoff);

      if (!pending || pending.length === 0) continue;

      const summary =
        pending.length === 1
          ? pending[0].title
          : `Tenes ${pending.length} alertas nuevas`;

      await sendPushToUser(userId, {
        title: summary,
        body: pending.length === 1 ? undefined : pending.slice(0, 3).map((p) => p.title).join(' · '),
        link: '/settings/notifications',
      });

      await supabase
        .from('notifications')
        .update({ push_sent_at: new Date().toISOString() })
        .in('id', pending.map((p) => p.id));

      usersNotified += 1;
    }

    return respond({ success: true, usersNotified });
  } catch (error: unknown) {
    logger.error('notifications_digest.unhandled_error', { error });
    return respond(apiError('INTERNAL_SERVER_ERROR'), { status: 500 });
  }
}
