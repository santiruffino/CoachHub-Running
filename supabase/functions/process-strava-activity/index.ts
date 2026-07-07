import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"
import { flattenWorkout, matchLapsToWorkout, calculateWorkoutTotals } from "../_shared/workoutMatcher.ts"
import { createEdgeLogger, getEdgeRequestId, withRequestIdHeader } from "../_shared/logger.ts"

/**
 * process-strava-activity
 * 
 * Triggered by the Strava Webhook for various event types.
 * - Create/Update: Fetches activity details and persists to activities table
 * - Delete: Removes activity from database
 * - Deauthorization: Removes user tokens from strava_connections
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function estimateLoadScore(activity: Record<string, unknown>): number {
  const suffer = activity.suffer_score
  if (typeof suffer === 'number' && Number.isFinite(suffer)) {
    return Math.max(0, suffer)
  }

  const moving = typeof activity.moving_time === 'number' ? activity.moving_time : 0
  const elapsed = typeof activity.elapsed_time === 'number' ? activity.elapsed_time : 0
  const duration = moving || elapsed
  const durationHours = Math.max(0, duration) / 3600
  if (durationHours <= 0) return 0

  return durationHours * 45
}

Deno.serve(async (req) => {
  const requestId = getEdgeRequestId(req)
  const logger = createEdgeLogger({ route: 'process-strava-activity', requestId })
  const jsonHeaders = withRequestIdHeader({ ...corsHeaders, 'Content-Type': 'application/json' }, requestId)

  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: withRequestIdHeader(corsHeaders, requestId) })
  }

  // Custom Authentication: Verify the webhook secret.
  const webhookSecret = req.headers.get('x-webhook-secret')
  const expectedSecret = Deno.env.get('STRAVA_WEBHOOK_SHARED_SECRET')
  
  if (!webhookSecret || webhookSecret !== expectedSecret) {
    logger.error('webhook.unauthorized_request')
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      headers: jsonHeaders,
      status: 401,
    })
  }

  try {
    const payload = await req.json()
    const { object_type, aspect_type, object_id, owner_id, updates } = payload

    if (!object_type || !aspect_type || !object_id || !owner_id) {
      throw new Error('Incomplete webhook payload')
    }

    // Initialize Supabase Client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    logger.info('webhook.processing', { objectType: object_type, aspectType: aspect_type, objectId: object_id })

    // CASE 1: ATHLETE DEAUTHORIZATION
    if (object_type === 'athlete' && updates?.authorized === false) {
      logger.info('webhook.athlete_revoked_access', { ownerId: owner_id })

      const { data: revokedConnection, error: revokedConnError } = await supabase
        .from('strava_connections')
        .select('user_id, refresh_token')
        .eq('strava_athlete_id', owner_id.toString())
        .maybeSingle()

      if (revokedConnError) throw revokedConnError

      if (revokedConnection?.user_id) {
        // The webhook payload itself isn't signed by Strava, so before destroying
        // a user's data we confirm the revocation against Strava's own token
        // endpoint: a truly deauthorized app gets invalid_grant on refresh.
        // If the refresh still succeeds, the app is still authorized and this
        // event is treated as unconfirmed (possibly forged) rather than acted on.
        const confirmResponse = await fetch('https://www.strava.com/oauth/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            client_id: Deno.env.get('STRAVA_CLIENT_ID'),
            client_secret: Deno.env.get('STRAVA_CLIENT_SECRET'),
            refresh_token: revokedConnection.refresh_token,
            grant_type: 'refresh_token',
          }),
        })

        if (confirmResponse.ok) {
          logger.warn('webhook.deauthorization_unconfirmed', { ownerId: owner_id })
          return new Response(JSON.stringify({ success: true, message: 'Deauthorization not confirmed by Strava; ignored' }), {
            headers: jsonHeaders,
            status: 200,
          })
        }

        logger.info('webhook.deauthorization_confirmed', { ownerId: owner_id, status: confirmResponse.status })

        const userId = revokedConnection.user_id

        const { error: deleteActivitiesError } = await supabase
          .from('activities')
          .delete()
          .eq('user_id', userId)
          .eq('provider', 'strava')
          .not('external_id', 'is', null)

        if (deleteActivitiesError) throw deleteActivitiesError

        const { error: clearZonesError } = await supabase
          .from('athlete_profiles')
          .update({
            hr_zones: null,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId)

        if (clearZonesError) throw clearZonesError

        const { error: deleteSyncLogsError } = await supabase
          .from('sync_logs')
          .delete()
          .eq('user_id', userId)

        if (deleteSyncLogsError) throw deleteSyncLogsError
      }

      const { error: deleteError } = await supabase
        .from('strava_connections')
        .delete()
        .eq('strava_athlete_id', owner_id.toString())

      if (deleteError) throw deleteError
      
      return new Response(JSON.stringify({ success: true, message: 'Access revoked' }), {
        headers: jsonHeaders,
        status: 200,
      })
    }

    // CASE 2: ACTIVITY DELETE
    if (object_type === 'activity' && aspect_type === 'delete') {
      logger.info('webhook.deleting_activity', { objectId: object_id })

      const { data: deleteConnection, error: deleteConnError } = await supabase
        .from('strava_connections')
        .select('user_id')
        .eq('strava_athlete_id', owner_id.toString())
        .maybeSingle()

      if (deleteConnError || !deleteConnection?.user_id) {
        logger.warn('webhook.delete_user_not_resolved', { objectId: object_id, error: deleteConnError })
        return new Response(JSON.stringify({ success: true, message: 'No matching user for delete event' }), {
          headers: jsonHeaders,
          status: 200,
        })
      }

      const { error: deleteError } = await supabase
        .from('activities')
        .delete()
        .eq('user_id', deleteConnection.user_id)
        .eq('external_id', object_id.toString())

      if (deleteError) throw deleteError

      return new Response(JSON.stringify({ success: true, message: 'Activity deleted' }), {
        headers: jsonHeaders,
        status: 200,
      })
    }

    // CASE 3: ACTIVITY CREATE / UPDATE
    if (object_type === 'activity' && (aspect_type === 'create' || aspect_type === 'update')) {
      // 1. Get Strava connection
      const { data: connection, error: connError } = await supabase
        .from('strava_connections')
        .select('*')
        .eq('strava_athlete_id', owner_id.toString())
        .single()

      if (connError || !connection) {
        throw new Error(`Strava connection not found for athlete ${owner_id}`)
      }

      const { user_id, access_token, refresh_token, expires_at } = connection

      // 2. Refresh token if expired
      let currentToken = access_token
      const now = Math.floor(Date.now() / 1000)

      if (expires_at <= now + 60) {
        logger.info('webhook.refreshing_token', { userId: user_id })
        const refreshResponse = await fetch('https://www.strava.com/oauth/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            client_id: Deno.env.get('STRAVA_CLIENT_ID'),
            client_secret: Deno.env.get('STRAVA_CLIENT_SECRET'),
            refresh_token: refresh_token,
            grant_type: 'refresh_token',
          }),
        })

        if (!refreshResponse.ok) throw new Error('Failed to refresh Strava token')

        const tokenData = await refreshResponse.json()
        currentToken = tokenData.access_token

        await supabase
          .from('strava_connections')
          .update({
            access_token: tokenData.access_token,
            refresh_token: tokenData.refresh_token,
            expires_at: tokenData.expires_at,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user_id)
      }

      // 3. Fetch activity details from Strava
      const activityResponse = await fetch(
        `https://www.strava.com/api/v3/activities/${object_id}`,
        { headers: { 'Authorization': `Bearer ${currentToken}` } }
      )

      if (!activityResponse.ok) {
        if (activityResponse.status === 404) {
          return new Response(JSON.stringify({ success: false, error: 'Not found' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          })
        }
        throw new Error(`Strava API error: ${activityResponse.statusText}`)
      }

      const activity = await activityResponse.json()
      const sufferScore = typeof activity.suffer_score === 'number' ? activity.suffer_score : null
      const loadScore = estimateLoadScore(activity)

      // 4. Persist to activities table.
      // Note: the matching engine below only runs on this Strava path (Garmin sync does
      // not match assignments), so we intentionally do NOT skip persisting here even if
      // the athlete also has a Garmin connection. If a Garmin copy of this same workout
      // shows up later, the daily garmin-backfill job deletes this Strava row and
      // repoints any training_assignments that reference it at the Garmin activity
      // (see syncGarminActivitiesForUser in src/lib/garmin/sync-activities.ts), so the
      // match made here survives the provider swap.
      const { data: upsertData, error: insertError } = await supabase
        .from('activities')
        .upsert({
          user_id: user_id,
          external_id: activity.id.toString(),
          title: activity.name,
          type: activity.type,
          distance: activity.distance || 0,
          duration: activity.moving_time || activity.elapsed_time || 0,
          start_date: activity.start_date,
          elapsed_time: activity.elapsed_time || 0,
          elevation_gain: activity.total_elevation_gain || 0,
          average_speed: activity.average_speed || 0,
          max_speed: activity.max_speed || 0,
          avg_hr: activity.average_heartrate || null,
          max_hr: activity.max_heartrate || null,
          suffer_score: sufferScore,
          load_score: loadScore,
          is_private: activity.private || false,
          metadata: activity,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id,external_id' })
        .select()
        .single()

      if (insertError) throw insertError

      logger.info('webhook.activity_synced', { objectId: object_id, userId: user_id })

        // 5. Trigger Matching Engine
        try {
          const { data: athleteProfile } = await supabase
            .from('profiles')
            .select('coach_id, team_id')
            .eq('id', user_id)
            .single();

          let matchingThreshold = 15;

          if (athleteProfile?.coach_id && athleteProfile?.team_id) {
            const { data: coachSettings } = await supabase
              .from('coach_settings')
              .select('thresholds')
              .eq('coach_id', athleteProfile.coach_id)
              .eq('team_id', athleteProfile.team_id)
              .maybeSingle();

            const coachThreshold = coachSettings?.thresholds as { matchingThresholdPercentage?: number } | null | undefined;
            if (typeof coachThreshold?.matchingThresholdPercentage === 'number' && Number.isFinite(coachThreshold.matchingThresholdPercentage)) {
              matchingThreshold = coachThreshold.matchingThresholdPercentage;
            } else {
              const { data: teamSettings } = await supabase
                .from('team_settings')
                .select('thresholds')
                .eq('team_id', athleteProfile.team_id)
                .maybeSingle();

              const teamThreshold = teamSettings?.thresholds as { matchingThresholdPercentage?: number } | null | undefined;
              if (typeof teamThreshold?.matchingThresholdPercentage === 'number' && Number.isFinite(teamThreshold.matchingThresholdPercentage)) {
                matchingThreshold = teamThreshold.matchingThresholdPercentage;
              }
            }
          }

          const activityDateStr = activity.start_date_local.split('T')[0];
          const activityLaps = activity.laps || [];
          const activityDistance = activity.distance || 0;
        const activityDuration = activity.moving_time || activity.elapsed_time || 0;

        const { data: assignments } = await supabase
          .from('training_assignments')
          .select('*, training:trainings(*)')
          .eq('user_id', user_id)
          .eq('scheduled_date', activityDateStr)
          .eq('compliance_status', 'planned');

        if (assignments && assignments.length > 0) {
          const candidates = [];

          for (const assignment of assignments) {
            const blocks = assignment.training?.blocks || [];
            if (blocks.length === 0) continue;

            const flatSteps = flattenWorkout(blocks);
            const totals = calculateWorkoutTotals(flatSteps);
            
            // Simple Match: Compare total distance and duration
            const distVar = totals.distance > 0 ? Math.abs(activityDistance - totals.distance) / totals.distance : 1;
            const durVar = totals.duration > 0 ? Math.abs(activityDuration - totals.duration) / totals.duration : 1;
            
            const simpleMatches = distVar <= (matchingThreshold / 100) || durVar <= (matchingThreshold / 100);

            // Lap Match: Generate confidence score
            const matchedLaps = matchLapsToWorkout(activityLaps, flatSteps, matchingThreshold);
            const matchedStepsCount = matchedLaps.filter(ml => ml.matched).length;
            const lapConfidence = flatSteps.length > 0 ? matchedStepsCount / flatSteps.length : 0;

            if (simpleMatches || lapConfidence > 0.5) {
              candidates.push({
                assignment,
                confidence: lapConfidence,
                simpleMatches,
                details: matchedLaps
              });
            }
          }

          if (candidates.length > 0) {
            // Sort by lap confidence to find the best match
            candidates.sort((a, b) => b.confidence - a.confidence);
            const bestMatch = candidates[0];

            await supabase.from('matching_log').insert({
              activity_id: upsertData.id,
              assignment_id: bestMatch.assignment.id,
              score: bestMatch.confidence,
              match_details: { 
                laps: bestMatch.details,
                simple_match: bestMatch.simpleMatches,
                candidates_count: candidates.length
              }
            });

            // Only auto-link when the matching engine is genuinely confident.
            // Weaker candidates are surfaced to the coach for manual review instead
            // of silently marking the assignment as completed/partial (SAN-89).
            const isStrongMatch = bestMatch.confidence >= 0.85 || (bestMatch.simpleMatches && bestMatch.confidence > 0.6);

            if (isStrongMatch) {
              await supabase.from('training_assignments')
                .update({
                  strava_activity_id: upsertData.id,
                  compliance_status: 'completed',
                  completed: true,
                  link_status: 'auto_linked',
                  updated_at: new Date().toISOString()
                })
                .eq('id', bestMatch.assignment.id);

              logger.info('webhook.assignment_auto_linked', {
                assignmentId: bestMatch.assignment.id,
                activityId: upsertData.id,
                confidence: bestMatch.confidence,
              });
            } else {
              await supabase.from('training_assignments')
                .update({
                  link_status: 'pending_review',
                  updated_at: new Date().toISOString()
                })
                .eq('id', bestMatch.assignment.id);

              logger.info('webhook.assignment_pending_review', {
                assignmentId: bestMatch.assignment.id,
                activityId: upsertData.id,
                confidence: bestMatch.confidence,
              });
            }
          }
        }
      } catch (matchError) {
        logger.error('webhook.matching_engine_error', { error: matchError, objectId: object_id, userId: user_id })
      }

      try {
        const appBaseUrl = Deno.env.get('APP_BASE_URL')
        const webhookSecret = Deno.env.get('STRAVA_WEBHOOK_SHARED_SECRET')

        if (appBaseUrl && webhookSecret) {
          await fetch(`${appBaseUrl}/api/v2/internal/strava/evaluate-alerts`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Webhook-Secret': webhookSecret,
            },
            body: JSON.stringify({
              athleteUserId: user_id,
              activityId: upsertData.id,
              activityTitle: activity.name,
              isNewActivity: aspect_type === 'create',
            }),
          })
        } else {
          logger.warn('webhook.evaluate_alerts_skipped_missing_config')
        }
      } catch (alertsError) {
        logger.error('webhook.evaluate_alerts_error', { error: alertsError, objectId: object_id, userId: user_id })
      }

      return new Response(JSON.stringify({ success: true, activity_id: upsertData.id }), {
        headers: jsonHeaders,
        status: 200,
      })
    }

    return new Response(JSON.stringify({ success: true, message: 'Event ignored' }), {
      headers: jsonHeaders,
      status: 200,
    })

  } catch (error) {
    logger.error('webhook.unhandled_error', { error })
    return new Response(JSON.stringify({ error: 'Webhook processing failed' }), {
      headers: jsonHeaders,
      status: 400,
    })
  }
})
