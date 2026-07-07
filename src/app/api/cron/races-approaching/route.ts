import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { createNotification } from '@/lib/notifications/create-notification';
import { createRequestLogger, withRequestId } from '@/lib/logger';
import { apiError } from '@/lib/api/error-response';
import { secureCompare } from '@/lib/api/secure-compare';

const REMINDER_DAYS_OUT = 7;

interface AthleteRaceRow {
  id: string;
  athlete_id: string;
  name_override: string | null;
  date: string;
  race: { name: string } | { name: string }[] | null;
}

function resolveRaceName(row: AthleteRaceRow): string {
  if (row.name_override) return row.name_override;
  const race = Array.isArray(row.race) ? row.race[0] : row.race;
  return race?.name || 'tu carrera';
}

/**
 * Notifies each athlete once, `REMINDER_DAYS_OUT` days ahead, that a planned
 * race is approaching. Dedup is tracked via `athlete_races.reminder_sent_at`
 * so a cron retry (or re-run for the same day) never double-notifies.
 * Triggered by Vercel Cron (see vercel.json).
 */
export async function GET(request: NextRequest) {
  const { requestId, logger } = createRequestLogger('/api/cron/races-approaching', request);
  const respond = (body: unknown, init?: ResponseInit) =>
    NextResponse.json(body, withRequestId(init, requestId));

  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');

  if (!cronSecret || !secureCompare(authHeader, `Bearer ${cronSecret}`)) {
    logger.warn('races_approaching.unauthorized');
    return respond(apiError('AUTH_UNAUTHORIZED'), { status: 401 });
  }

  try {
    const supabase = createServiceRoleClient();
    const targetDate = new Date();
    targetDate.setUTCDate(targetDate.getUTCDate() + REMINDER_DAYS_OUT);
    const targetDateStr = targetDate.toISOString().split('T')[0];

    const { data: upcomingRaces, error } = await supabase
      .from('athlete_races')
      .select('id, athlete_id, name_override, date, race:races(name)')
      .eq('date', targetDateStr)
      .eq('status', 'PLANNED')
      .is('reminder_sent_at', null);

    if (error) {
      logger.error('races_approaching.fetch_failed', { error });
      return respond(apiError('INTERNAL_SERVER_ERROR'), { status: 500 });
    }

    if (!upcomingRaces || upcomingRaces.length === 0) {
      return respond({ success: true, athletesNotified: 0 });
    }

    let athletesNotified = 0;

    for (const row of upcomingRaces as unknown as AthleteRaceRow[]) {
      await createNotification({
        userId: row.athlete_id,
        category: 'race_reminder',
        title: `${resolveRaceName(row)} es en ${REMINDER_DAYS_OUT} días`,
        body: `Fecha de carrera: ${row.date}`,
        link: '/races',
      });

      await supabase
        .from('athlete_races')
        .update({ reminder_sent_at: new Date().toISOString() })
        .eq('id', row.id);

      athletesNotified += 1;
    }

    return respond({ success: true, athletesNotified });
  } catch (error: unknown) {
    logger.error('races_approaching.unhandled_error', { error });
    return respond(apiError('INTERNAL_SERVER_ERROR'), { status: 500 });
  }
}
