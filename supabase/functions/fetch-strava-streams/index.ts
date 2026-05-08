import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"
import { createEdgeLogger, getEdgeRequestId, withRequestIdHeader } from "../_shared/logger.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const STREAM_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000

const toIsoDate = (value: unknown): string | null => {
  if (!value || typeof value !== 'string') return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString()
}

const isCacheFresh = (createdAt: unknown): boolean => {
  const iso = toIsoDate(createdAt)
  if (!iso) return false
  const ageMs = Date.now() - new Date(iso).getTime()
  return ageMs <= STREAM_CACHE_TTL_MS
}

Deno.serve(async (req) => {
  const requestId = getEdgeRequestId(req)
  const logger = createEdgeLogger({ route: 'fetch-strava-streams', requestId })

  const jsonHeaders = withRequestIdHeader({ ...corsHeaders, 'Content-Type': 'application/json' }, requestId)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: withRequestIdHeader(corsHeaders, requestId) })
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
            headers: jsonHeaders,
            status: 401,
        })
    }
    
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
        logger.error('streams.auth_error', { error: authError })
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            headers: jsonHeaders,
            status: 401,
        })
    }

    // 3. Get Activity UUID from URL
    const url = new URL(req.url)
    const activityUuid = url.searchParams.get('uuid')
    if (!activityUuid) {
        return new Response(JSON.stringify({ error: 'Missing activity UUID' }), {
            headers: jsonHeaders,
            status: 400,
        })
    }

    logger.info('streams.request_received', { activityId: activityUuid, userId: user.id })

    // 4. Check Cache by UUID
    const { data: cachedStream, error: cacheError } = await supabase
      .from('activity_streams')
      .select('stream_data, activity_id, created_at')
      .eq('activity_id', activityUuid)
      .maybeSingle()

    if (cacheError) {
        logger.error('streams.cache_lookup_error', { activityId: activityUuid, error: cacheError })
    }

    if (cachedStream && isCacheFresh(cachedStream.created_at)) {
      logger.debug('streams.cache_hit', { activityId: activityUuid })
      return new Response(JSON.stringify(cachedStream.stream_data), {
        headers: jsonHeaders,
        status: 200,
      })
    }

    if (cachedStream && !isCacheFresh(cachedStream.created_at)) {
      logger.info('streams.cache_expired', { activityId: activityUuid })
      await supabase
        .from('activity_streams')
        .delete()
        .eq('activity_id', activityUuid)
    }

    // 5. Cache Miss - Fetch from Strava
    logger.info('streams.cache_miss', { activityId: activityUuid })
    
    // First, find the activity by UUID to get external_id (for Strava API) and verify permissions
    const { data: activity, error: activityError } = await supabase
      .from('activities')
      .select('id, user_id, external_id')
      .eq('id', activityUuid)
      .single()

    if (activityError || !activity) {
        logger.error('streams.activity_not_found', { activityId: activityUuid, error: activityError })
        return new Response(JSON.stringify({ error: 'Activity not found in system' }), {
            headers: jsonHeaders,
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
        logger.error('streams.profile_lookup_error', {
          viewerProfileError,
          athleteProfileError,
        })
        return new Response(JSON.stringify({ error: 'Forbidden' }), {
          headers: jsonHeaders,
          status: 403,
        })
      }

      const isTeamCoach =
        (viewerProfile.role === 'COACH' || viewerProfile.role === 'ADMIN') &&
        !!viewerProfile.team_id &&
        viewerProfile.team_id === athleteProfile.team_id

      if (!isTeamCoach) {
        return new Response(JSON.stringify({ error: 'Forbidden' }), {
          headers: jsonHeaders,
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
        logger.error('streams.connection_not_found', { userId: activity.user_id, error: connError })
        return new Response(JSON.stringify({ error: 'Strava connection not found' }), {
            headers: jsonHeaders,
            status: 404,
        })
    }

    let accessToken = connection.access_token
    const now = Math.floor(Date.now() / 1000)

    // Refresh token if expired
    if (connection.expires_at <= now + 60) {
      logger.info('streams.refreshing_token', { userId: activity.user_id })
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
          logger.error('streams.token_refresh_failed', { status: refreshResponse.status, userId: activity.user_id })
          return new Response(JSON.stringify({ error: 'Failed to refresh Strava token' }), {
            headers: jsonHeaders,
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
    
    logger.debug('streams.fetching_from_strava', { activityId: activityUuid })
    
    const stravaResponse = await fetch(stravaUrl, { 
        headers: { 'Authorization': `Bearer ${accessToken}` } 
    })

    if (!stravaResponse.ok) {
        logger.error('streams.strava_api_error', {
          status: stravaResponse.status,
          statusText: stravaResponse.statusText,
          activityId: activityUuid,
        })
        return new Response(JSON.stringify({ 
            error: 'Strava API error', 
            status: stravaResponse.status
        }), {
            headers: jsonHeaders,
            status: stravaResponse.status === 429 ? 429 : 502,
        })
    }
    
    const streamsData = await stravaResponse.json()

    // 6. Persist to Cache
    logger.debug('streams.persisting_cache', { activityId: activityUuid })
    const { error: persistError } = await supabase
      .from('activity_streams')
      .upsert({
        activity_id: activity.id,
        external_id: activity.external_id,
        stream_data: streamsData,
        created_at: new Date().toISOString()
      }, { onConflict: 'activity_id' })
    
    if (persistError) logger.error('streams.cache_persist_error', { activityId: activityUuid, error: persistError })

    await supabase.rpc('purge_expired_activity_streams')

    return new Response(JSON.stringify(streamsData), {
      headers: jsonHeaders,
      status: 200,
    })

  } catch (error) {
    logger.error('streams.unhandled_error', { error })
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      headers: jsonHeaders,
      status: 500,
    })
  }
})
