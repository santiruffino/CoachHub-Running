import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"
import { flattenWorkout, matchLapsToWorkout } from "../_shared/workoutMatcher.ts"

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

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Custom Authentication: Verify the webhook secret.
  const webhookSecret = req.headers.get('x-webhook-secret')
  const expectedSecret = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  
  console.log(`[DEBUG] Received request. Secret present: ${!!webhookSecret}, Matches expected: ${webhookSecret === expectedSecret}`);

  if (!webhookSecret || webhookSecret !== expectedSecret) {
    console.error(`Unauthorized: Invalid or missing X-Webhook-Secret. Received: ${webhookSecret?.substring(0, 5)}... Expected: ${expectedSecret?.substring(0, 5)}...`)
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 401,
    })
  }

  try {
    const payload = await req.json()
    console.log('[DEBUG] Payload received:', JSON.stringify(payload));
    const { object_type, aspect_type, object_id, owner_id, updates } = payload

    if (!object_type || !aspect_type || !object_id || !owner_id) {
      console.error('[ERROR] Incomplete payload fields');
      throw new Error('Incomplete webhook payload')
    }

    // Initialize Supabase Client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log(`Processing Strava event: ${object_type}.${aspect_type} for object ${object_id}`)

    // CASE 1: ATHLETE DEAUTHORIZATION
    if (object_type === 'athlete' && updates?.authorized === false) {
      console.log(`User ${owner_id} revoked access. Cleaning up tokens...`)
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
      console.log(`Deleting activity ${object_id} from database...`)
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
      // 1. Get Strava connection using owner_id (strava_athlete_id)
      const { data: connection, error: connError } = await supabase
        .from('strava_connections')
        .select('*')
        .eq('strava_athlete_id', owner_id.toString())
        .single()

      if (connError || !connection) {
        console.error('Connection error:', connError)
        throw new Error(`Strava connection not found for athlete ${owner_id}`)
      }

      const { user_id, access_token, refresh_token, expires_at } = connection

      // 2. Refresh token if expired
      let currentToken = access_token
      const now = Math.floor(Date.now() / 1000)

      if (expires_at <= now + 60) {
        console.log('Refreshing Strava token...')
        const clientId = Deno.env.get('STRAVA_CLIENT_ID')
        const clientSecret = Deno.env.get('STRAVA_CLIENT_SECRET')

        const refreshResponse = await fetch('https://www.strava.com/oauth/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            client_id: clientId,
            client_secret: clientSecret,
            refresh_token: refresh_token,
            grant_type: 'refresh_token',
          }),
        })

        if (!refreshResponse.ok) {
          throw new Error('Failed to refresh Strava token')
        }

        const tokenData = await refreshResponse.json()
        currentToken = tokenData.access_token

        // Update stored tokens
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
        {
          headers: {
            'Authorization': `Bearer ${currentToken}`,
          },
        }
      )

      if (!activityResponse.ok) {
        if (activityResponse.status === 404) {
          console.warn(`Activity ${object_id} not found (might have been deleted or private)`)
          return new Response(JSON.stringify({ success: false, error: 'Not found' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          })
        }
        throw new Error(`Failed to fetch activity from Strava: ${activityResponse.statusText}`)
      }

      const activity = await activityResponse.json()

      // 5. Persist to activities table (Upsert using external_id)
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
        }, {
          onConflict: 'external_id'
        })
        .select()
        .single()

      if (insertError) throw insertError

      console.log(`Successfully synced activity ${object_id} for user ${user_id}`)

      // 6. Trigger Matching Engine (SAN-27)
      try {
        const matchingThreshold = parseFloat(Deno.env.get('MATCHING_THRESHOLD_PERCENTAGE') || '15');
        const activityDateStr = activity.start_date_local.split('T')[0];
        const activityLaps = activity.laps || [];

        console.log(`Running matching engine for activity ${object_id} on date ${activityDateStr}`);

        // Get planned assignments for this athlete on this date
        const { data: assignments, error: assignmentsError } = await supabase
          .from('training_assignments')
          .select('*, training:trainings(*)')
          .eq('user_id', user_id)
          .eq('scheduled_date', activityDateStr)
          .eq('compliance_status', 'planned');

        if (assignmentsError) {
          console.error('Error fetching assignments for matching:', assignmentsError);
        } else if (assignments && assignments.length > 0) {
          console.log(`Found ${assignments.length} candidate assignments for matching`);

          let bestMatch = null;
          let highestConfidence = 0;
          let bestMatchDetails = null;

          for (const assignment of assignments) {
            const blocks = assignment.training?.blocks || [];
            if (blocks.length === 0) continue;

            const flatSteps = flattenWorkout(blocks);
            const matchedLaps = matchLapsToWorkout(activityLaps, flatSteps, matchingThreshold);
            
            // Calculate aggregate confidence: % of planned steps that were matched
            const totalPlannedSteps = flatSteps.length;
            const matchedStepsCount = matchedLaps.filter(ml => ml.matched).length;
            const confidenceScore = totalPlannedSteps > 0 ? matchedStepsCount / totalPlannedSteps : 0;

            console.log(`Assignment ${assignment.id} match confidence: ${confidenceScore.toFixed(2)}`);

            if (confidenceScore > highestConfidence) {
              highestConfidence = confidenceScore;
              bestMatch = assignment;
              bestMatchDetails = matchedLaps;
            }
          }

          // If we found a solid match (e.g. > 50% confidence or based on threshold)
          if (bestMatch && highestConfidence > 0.5) {
            console.log(`Confirmed match with assignment ${bestMatch.id}. Updating...`);

            // Persist match log
            const { error: logError } = await supabase
              .from('matching_log')
              .insert({
                activity_id: upsertData.id,
                assignment_id: bestMatch.id,
                score: highestConfidence,
                match_details: { laps: bestMatchDetails }
              });

            if (logError) console.error('Error saving matching log:', logError);

            // Update assignment status
            const status = highestConfidence >= 0.85 ? 'completed' : 'partial';
            const { error: updateError } = await supabase
              .from('training_assignments')
              .update({
                strava_activity_id: upsertData.id,
                compliance_status: status
              })
              .eq('id', bestMatch.id);

            if (updateError) console.error('Error updating assignment status:', updateError);
          } else {
            console.log('No strong match found for this activity.');
          }
        } else {
          console.log('No planned assignments found for this date.');
        }
      } catch (matchError) {
        console.error('Unexpected error in matching engine:', matchError);
      }

      return new Response(JSON.stringify({ success: true, activity_id: upsertData.id }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // Default response for unhandled combinations
    return new Response(JSON.stringify({ success: true, message: 'Event ignored' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Error processing event:', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
