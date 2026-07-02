import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { normalizeCoachSettings } from '@/lib/settings/defaults';
import { evaluateAthleteAlerts, AthleteAlertType } from '@/lib/alerts/evaluate-athlete';
import { createNotification, NotificationCategory } from '@/lib/notifications/create-notification';
import { createRequestLogger, withRequestId } from '@/lib/logger';
import { apiError } from '@/lib/api/error-response';

const ALERT_TYPE_TO_CATEGORY: Record<AthleteAlertType, NotificationCategory> = {
  RPE_MISMATCH: 'rpe_mismatch',
  LOW_COMPLIANCE: 'low_compliance',
  TRAINING_LOAD: 'training_load',
};

/**
 * Internal endpoint called by the `process-strava-activity` Edge Function right after a
 * Strava activity is synced and matched. Notifies the athlete that their activity synced
 * (when newly created), then evaluates RPE mismatch / low compliance / training load alerts
 * for the affected athlete, persists them to `alerts` (deduped per coach+athlete+type+day via
 * a unique index) and notifies the coach only when the alert is newly created.
 */
export async function POST(request: NextRequest) {
  const { requestId, logger } = createRequestLogger('/api/v2/internal/strava/evaluate-alerts', request);
  const respond = (body: unknown, init?: ResponseInit) =>
    NextResponse.json(body, withRequestId(init, requestId));

  try {
    const sharedSecret = process.env.STRAVA_WEBHOOK_SHARED_SECRET;
    const providedSecret = request.headers.get('x-webhook-secret');

    if (!sharedSecret || providedSecret !== sharedSecret) {
      logger.warn('evaluate_alerts.unauthorized');
      return respond(apiError('AUTH_UNAUTHORIZED'), { status: 401 });
    }

    const body = (await request.json()) as {
      athleteUserId?: string;
      activityId?: string;
      activityTitle?: string;
      isNewActivity?: boolean;
    };
    const athleteUserId = body?.athleteUserId;

    if (!athleteUserId) {
      return respond(apiError('VALIDATION_MISSING_ATHLETE_USER_ID'), { status: 400 });
    }

    const supabase = createServiceRoleClient();

    if (body.isNewActivity && body.activityId) {
      await createNotification({
        userId: athleteUserId,
        category: 'system',
        title: 'Actividad sincronizada',
        body: body.activityTitle || null,
        link: `/activities/${body.activityId}`,
      });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, name, coach_id, team_id')
      .eq('id', athleteUserId)
      .single();

    if (!profile?.coach_id || !profile?.team_id) {
      return respond({ success: true, skipped: 'no_coach' });
    }

    const { data: settingsData } = await supabase
      .from('coach_settings')
      .select('thresholds, default_models')
      .eq('coach_id', profile.coach_id)
      .eq('team_id', profile.team_id)
      .maybeSingle();

    const settings = normalizeCoachSettings({
      thresholds: settingsData?.thresholds,
      default_models: settingsData?.default_models,
    });

    const alerts = await evaluateAthleteAlerts(supabase, athleteUserId, profile.name || 'El atleta', settings);

    let created = 0;
    for (const alert of alerts) {
      const { data: inserted, error: insertError } = await supabase
        .from('alerts')
        .insert({
          coach_id: profile.coach_id,
          recipient_coach_id: profile.coach_id,
          team_id: profile.team_id,
          scope: 'COACH',
          athlete_id: athleteUserId,
          type: alert.type,
          message: alert.message,
          score: alert.score,
          priority: alert.priority,
          reason_codes: alert.reasonCodes,
          recommended_action: alert.recommendedAction,
          status: 'OPEN',
        })
        .select('id')
        .maybeSingle();

      if (insertError) {
        if (insertError.code !== '23505') {
          logger.error('evaluate_alerts.insert_failed', { error: insertError, athleteUserId, type: alert.type });
        }
        continue;
      }

      if (inserted) {
        created += 1;
        await createNotification({
          userId: profile.coach_id,
          category: ALERT_TYPE_TO_CATEGORY[alert.type],
          title: alert.message,
          body: alert.recommendedAction,
          link: `/athletes/${athleteUserId}`,
        });
      }
    }

    return respond({ success: true, evaluated: alerts.length, created });
  } catch (error: unknown) {
    logger.error('evaluate_alerts.unhandled_error', { error });
    return respond(apiError('INTERNAL_SERVER_ERROR'), { status: 500 });
  }
}
