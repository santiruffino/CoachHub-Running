import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Initialize Supabase Client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // 2. Get User from Auth Header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
        return new Response(JSON.stringify({ error: 'No authorization header' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 401,
        })
    }
    
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
        console.error('[STREAMS] Auth error:', authError)
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 401,
        })
    }

    // 3. Get Activity UUID from URL
    const url = new URL(req.url)
    const activityUuid = url.searchParams.get('uuid')
    if (!activityUuid) {
        return new Response(JSON.stringify({ error: 'Missing activity UUID' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }

    console.log(`[STREAMS] Processing request for activity UUID: ${activityUuid} (User: ${user.id})`)

    // 4. Check Cache by UUID
    const { data: cachedStream, error: cacheError } = await supabase
      .from('activity_streams')
      .select('stream_data, activity_id')
      .eq('activity_id', activityUuid)
      .maybeSingle()

    if (cacheError) {
        console.error('[STREAMS] Cache lookup error:', cacheError)
    }

    if (cachedStream) {
      console.log(`[STREAMS] Cache hit for activity UUID: ${activityUuid}`)
      return new Response(JSON.stringify(cachedStream.stream_data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // 5. Cache Miss - Fetch from Strava
    console.log(`[STREAMS] Cache miss for UUID: ${activityUuid}. Fetching from Strava...`)
    
    // First, find the activity by UUID to get external_id (for Strava API) and verify permissions
    const { data: activity, error: activityError } = await supabase
      .from('activities')
      .select('id, user_id, external_id')
      .eq('id', activityUuid)
      .single()

    if (activityError || !activity) {
        console.error('[STREAMS] Activity not found in DB:', activityUuid, activityError)
        return new Response(JSON.stringify({ error: 'Activity not found in system' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 404,
        })
    }

    // Authorization: User must be owner OR coach/admin in the same team as owner
    if (activity.user_id !== user.id) {
      const { data: viewerProfile, error: viewerProfileError } = await supabase
        .from('profiles')
        .select('role, team_id')
        .eq('id', user.id)
        .single()

      const { data: athleteProfile, error: athleteProfileError } = await supabase
        .from('profiles')
        .select('team_id')
        .eq('id', activity.user_id)
        .single()

      if (viewerProfileError || athleteProfileError || !viewerProfile || !athleteProfile) {
        console.error('[STREAMS] Profile lookup error:', {
          viewerProfileError,
          athleteProfileError,
        })
        return new Response(JSON.stringify({ error: 'Forbidden' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 403,
        })
      }

      const isTeamCoach =
        (viewerProfile.role === 'COACH' || viewerProfile.role === 'ADMIN') &&
        !!viewerProfile.team_id &&
        viewerProfile.team_id === athleteProfile.team_id

      if (!isTeamCoach) {
        return new Response(JSON.stringify({ error: 'Forbidden' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 403,
        })
      }
    }

    // Get Strava connection for activity owner
    const { data: connection, error: connError } = await supabase
      .from('strava_connections')
      .select('*')
      .eq('user_id', activity.user_id)
      .single()

    if (connError || !connection) {
        console.error('[STREAMS] Strava connection not found for user:', activity.user_id)
        return new Response(JSON.stringify({ error: 'Strava connection not found' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 404,
        })
    }

    let accessToken = connection.access_token
    const now = Math.floor(Date.now() / 1000)

    // Refresh token if expired
    if (connection.expires_at <= now + 60) {
      console.log('[STREAMS] Refreshing Strava token...')
      const refreshResponse = await fetch('https://www.strava.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: Deno.env.get('STRAVA_CLIENT_ID'),
          client_secret: Deno.env.get('STRAVA_CLIENT_SECRET'),
          refresh_token: connection.refresh_token,
          grant_type: 'refresh_token',
        }),
      })

      if (!refreshResponse.ok) {
          const errorData = await refreshResponse.json().catch(() => ({}));
          console.error('[STREAMS] Token refresh failed:', errorData)
          return new Response(JSON.stringify({ error: 'Failed to refresh Strava token', details: errorData }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: refreshResponse.status === 401 ? 401 : 502,
          })
      }
      
      const tokenData = await refreshResponse.json()
      accessToken = tokenData.access_token

      await supabase
        .from('strava_connections')
        .update({
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          expires_at: tokenData.expires_at,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', activity.user_id)
    }

    // Fetch from Strava using the external_id
    const streamKeys = 'time,distance,latlng,altitude,heartrate,cadence,watts,velocity_smooth,grade_smooth'
    const stravaUrl = `https://www.strava.com/api/v3/activities/${activity.external_id}/streams?keys=${streamKeys}&key_by_type=true`
    
    console.log(`[STREAMS] Fetching from Strava: ${stravaUrl}`)
    
    const stravaResponse = await fetch(stravaUrl, { 
        headers: { 'Authorization': `Bearer ${accessToken}` } 
    })

    if (!stravaResponse.ok) {
        console.error(`[STREAMS] Strava API error: ${stravaResponse.status} ${stravaResponse.statusText}`)
        const errorText = await stravaResponse.text().catch(() => 'No error body')
        return new Response(JSON.stringify({ 
            error: 'Strava API error', 
            status: stravaResponse.status,
            details: errorText 
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: stravaResponse.status === 429 ? 429 : 502,
        })
    }
    
    const streamsData = await stravaResponse.json()

    // 6. Persist to Cache
    console.log(`[STREAMS] Persisting streams to cache for UUID: ${activityUuid}`)
    const { error: persistError } = await supabase
      .from('activity_streams')
      .upsert({
        activity_id: activity.id,
        external_id: activity.external_id,
        stream_data: streamsData,
        created_at: new Date().toISOString()
      }, { onConflict: 'activity_id' })
    
    if (persistError) console.error('[STREAMS] Error caching data:', persistError)

    return new Response(JSON.stringify(streamsData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error(`[STREAMS] Uncaught error: ${error.message}`)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
