import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"

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

      // 4. Filter for Run/TrailRun
      const allowedTypes = ['Run', 'TrailRun']
      if (!allowedTypes.includes(activity.type) && !allowedTypes.includes(activity.sport_type)) {
        console.log(`Skipping activity type: ${activity.type}`)
        return new Response(JSON.stringify({ success: true, message: 'Type ignored' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        })
      }

      // 5. Persist to activities table (Upsert using external_id)
      const { data: upsertData, error: insertError } = await supabase
        .from('activities')
        .upsert({
          user_id: user_id,
          external_id: activity.id.toString(),
          title: activity.name,
          type: activity.type,
          distance: activity.distance,
          duration: activity.moving_time,
          start_date: activity.start_date,
          elapsed_time: activity.elapsed_time,
          elevation_gain: activity.total_elevation_gain,
          average_speed: activity.average_speed,
          max_speed: activity.max_speed,
          avg_hr: activity.average_heartrate,
          max_hr: activity.max_heartrate,
          is_private: activity.private,
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
      // Logic for matching will be added here in the future
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
