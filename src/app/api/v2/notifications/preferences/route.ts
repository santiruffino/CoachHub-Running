import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase/api-helpers';
import { createServiceRoleClient } from '@/lib/supabase/server';
import * as Sentry from '@sentry/nextjs';
import { createRequestLogger, withRequestId } from '@/lib/logger';
import { apiError } from '@/lib/api/error-response';

const CATEGORIES = ['chat_message', 'workout_assigned', 'race_reminder', 'system', 'rpe_mismatch', 'low_compliance', 'training_load'] as const;
const COACH_ONLY_CATEGORIES = new Set(['rpe_mismatch', 'low_compliance', 'training_load']);
type Category = (typeof CATEGORIES)[number];
type Frequency = 'immediate' | 'daily' | 'weekly';

interface PreferenceRow {
  category: string;
  in_app_enabled: boolean;
  push_enabled: boolean;
  email_enabled: boolean;
  frequency: Frequency;
}

const DEFAULTS: Omit<PreferenceRow, 'category'> = {
  in_app_enabled: true,
  push_enabled: true,
  email_enabled: true,
  frequency: 'immediate',
};

interface PreferenceUpdateBody {
  category?: string;
  in_app_enabled?: boolean;
  push_enabled?: boolean;
  email_enabled?: boolean;
  frequency?: string;
}

export async function GET(request: NextRequest) {
  const { requestId, logger } = createRequestLogger('/api/v2/notifications/preferences', request);
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

    const [{ data: rows, error }, { data: profile }] = await Promise.all([
      serviceSupabase
        .from('notification_preferences')
        .select('category, in_app_enabled, push_enabled, email_enabled, frequency')
        .eq('user_id', user!.id),
      serviceSupabase.from('profiles').select('role').eq('id', user!.id).single(),
    ]);

    if (error) {
      logger.error('notification_preferences.load_failed', { error, userId: user!.id });
      return respond(apiError('NOTIFICATION_PREFERENCES_LOAD_FAILED', 'Failed to load preferences'), { status: 500 });
    }

    const isCoach = profile?.role === 'COACH' || profile?.role === 'ADMIN';
    const visibleCategories = CATEGORIES.filter((category) => isCoach || !COACH_ONLY_CATEGORIES.has(category));

    const rowsByCategory = new Map((rows || []).map((row) => [row.category, row]));

    const preferences: PreferenceRow[] = visibleCategories.map((category) => {
      const existing = rowsByCategory.get(category);
      return existing
        ? { category, in_app_enabled: existing.in_app_enabled, push_enabled: existing.push_enabled, email_enabled: existing.email_enabled, frequency: existing.frequency as Frequency }
        : { category, ...DEFAULTS };
    });

    return respond({ preferences });
  } catch (error: unknown) {
    logger.error('notification_preferences.unhandled_error', { error });
    Sentry.captureException(error, { tags: { route: '/api/v2/notifications/preferences', requestId } });
    return respond(apiError('INTERNAL_SERVER_ERROR'), { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const { requestId, logger } = createRequestLogger('/api/v2/notifications/preferences', request);
  const respond = (body: unknown, init?: ResponseInit) =>
    NextResponse.json(body, withRequestId(init, requestId));

  try {
    const authResult = await requireAuth();
    if (authResult.response) {
      authResult.response.headers.set('x-request-id', requestId);
      return authResult.response;
    }

    const { user } = authResult;
    const payload = (await request.json()) as PreferenceUpdateBody;

    if (!payload.category || !CATEGORIES.includes(payload.category as Category)) {
      return respond(apiError('VALIDATION_INVALID_CATEGORY', 'Invalid notification category'), { status: 400 });
    }

    if (payload.frequency && !['immediate', 'daily', 'weekly'].includes(payload.frequency)) {
      return respond(apiError('VALIDATION_INVALID_FREQUENCY', 'Invalid frequency'), { status: 400 });
    }

    const serviceSupabase = createServiceRoleClient();
    const { error } = await serviceSupabase
      .from('notification_preferences')
      .upsert(
        {
          user_id: user!.id,
          category: payload.category,
          in_app_enabled: payload.in_app_enabled ?? DEFAULTS.in_app_enabled,
          push_enabled: payload.push_enabled ?? DEFAULTS.push_enabled,
          email_enabled: payload.email_enabled ?? DEFAULTS.email_enabled,
          frequency: payload.frequency ?? DEFAULTS.frequency,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,category' }
      );

    if (error) {
      logger.error('notification_preferences.update_failed', { error, userId: user!.id });
      return respond(apiError('NOTIFICATION_PREFERENCES_UPDATE_FAILED', 'Failed to update preferences'), { status: 500 });
    }

    return respond({ success: true });
  } catch (error: unknown) {
    logger.error('notification_preferences.unhandled_error', { error });
    Sentry.captureException(error, { tags: { route: '/api/v2/notifications/preferences', requestId } });
    return respond(apiError('INTERNAL_SERVER_ERROR'), { status: 500 });
  }
}
