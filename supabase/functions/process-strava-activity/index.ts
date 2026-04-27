import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"
import { flattenWorkout, matchLapsToWorkout, calculateWorkoutTotals } from "../_shared/workoutMatcher.ts"

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

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Custom Authentication: Verify the webhook secret.
  const webhookSecret = req.headers.get('x-webhook-secret')
  const expectedSecret = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  
  if (!webhookSecret || webhookSecret !== expectedSecret) {
    console.error(`Unauthorized: Invalid or missing X-Webhook-Secret.`)
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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

    console.log(`[WEBHOOK] Processing: ${object_type}.${aspect_type} (ID: ${object_id})`)

    // CASE 1: ATHLETE DEAUTHORIZATION
    if (object_type === 'athlete' && updates?.authorized === false) {
      console.log(`[WEBHOOK] User ${owner_id} revoked access.`)
      const { error: deleteError } = await supabase
        .from('strava_connections')
        .delete()
        .eq('strava_athlete_id', owner_id.toString())

      if (deleteError) throw deleteError
      
      return new Response(JSON.stringify({ success: true, message: 'Access revoked' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // CASE 2: ACTIVITY DELETE
    if (object_type === 'activity' && aspect_type === 'delete') {
      console.log(`[WEBHOOK] Deleting activity ${object_id}`)
      const { error: deleteError } = await supabase
        .from('activities')
        .delete()
        .eq('external_id', object_id.toString())

      if (deleteError) throw deleteError

      return new Response(JSON.stringify({ success: true, message: 'Activity deleted' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
        console.log('[WEBHOOK] Refreshing Strava token...')
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

      // 4. Persist to activities table
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
          is_private: activity.private || false,
          metadata: activity,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'external_id' })
        .select()
        .single()

      if (insertError) throw insertError

      console.log(`[WEBHOOK] Synced activity ${object_id} for user ${user_id}`)

      // 5. Trigger Matching Engine
      try {
        const matchingThreshold = parseFloat(Deno.env.get('MATCHING_THRESHOLD_PERCENTAGE') || '15');
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

            const status = bestMatch.confidence >= 0.85 || (bestMatch.simpleMatches && bestMatch.confidence > 0.6) ? 'completed' : 'partial';
            
            await supabase.from('training_assignments')
              .update({ 
                strava_activity_id: upsertData.id, 
                compliance_status: status,
                updated_at: new Date().toISOString()
              })
              .eq('id', bestMatch.assignment.id);
          }
        }
      } catch (matchError) {
        console.error('[WEBHOOK] Matching engine error:', matchError);
      }

      return new Response(JSON.stringify({ success: true, activity_id: upsertData.id }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    return new Response(JSON.stringify({ success: true, message: 'Event ignored' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error(`[WEBHOOK] Error: ${error.message}`)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
