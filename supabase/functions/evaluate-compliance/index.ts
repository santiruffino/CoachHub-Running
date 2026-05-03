import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"

/**
 * evaluate-compliance
 * 
 * Triggered by a database webhook when a training_assignment is updated with a strava_activity_id.
 * Fetches zone data from Strava and compares it against the workout_snapshot.
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type WorkoutSnapshotBlock = {
  intensity?: number;
};

type WorkoutSnapshot = {
  blocks?: WorkoutSnapshotBlock[];
};

type WebhookRecord = {
  id: string;
  strava_activity_id?: string;
  user_id: string;
  workout_snapshot?: WorkoutSnapshot;
};

type WebhookPayload = {
  record: WebhookRecord;
  old_record: {
    strava_activity_id?: string;
  };
  type: string;
};

type TokenRefreshResponse = {
  access_token: string;
  refresh_token: string;
  expires_at: number;
};

type ZoneDistributionEntry = {
  min: number;
  max: number;
  time: number;
};

type ZoneSummary = {
  type: string;
  distribution?: ZoneDistributionEntry[];
};

type ViolationDetails = {
  targets: number[];
  distribution: ZoneDistributionEntry[];
  primaryMetric: 'heartrate';
};

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const payload = await req.json() as WebhookPayload
    console.log('[COMPLIANCE] Webhook received:', JSON.stringify(payload))
    
    const { record, old_record, type } = payload

    // We only care about updates where strava_activity_id was newly added
    if (type !== 'UPDATE' || !record.strava_activity_id || old_record.strava_activity_id) {
      console.log('[COMPLIANCE] Skipping: not a relevant update.')
      return new Response(JSON.stringify({ message: 'No action needed' }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      })
    }

    // Initialize Supabase Client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const activityId = record.strava_activity_id
    const userId = record.user_id
    const workoutSnapshot = record.workout_snapshot

    if (!workoutSnapshot) {
       console.log('[COMPLIANCE] Skipping: No workout snapshot found in assignment.')
       return new Response(JSON.stringify({ message: 'No workout snapshot found' }), { 
         headers: { ...corsHeaders, 'Content-Type': 'application/json' },
         status: 200 
       })
    }

    // 1. Get Strava tokens
    const { data: connection, error: connError } = await supabase
      .from('strava_connections')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (connError || !connection) {
      throw new Error(`Strava connection not found for user ${userId}`)
    }

    let currentToken = connection.access_token
    const now = Math.floor(Date.now() / 1000)

    // Refresh token if expired
    if (connection.expires_at <= now + 60) {
      console.log('[COMPLIANCE] Refreshing Strava token...')
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
      
      if (refreshResponse.ok) {
        const tokenData = await refreshResponse.json() as TokenRefreshResponse
        currentToken = tokenData.access_token
        await supabase.from('strava_connections').update({
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          expires_at: tokenData.expires_at,
          updated_at: new Date().toISOString(),
        }).eq('user_id', userId)
      }
    }

    // 2. Fetch Activity Zones from Strava
    const { data: activity, error: actError } = await supabase
      .from('activities')
      .select('external_id')
      .eq('id', activityId)
      .single()
    
    if (actError || !activity) throw new Error(`Activity ${activityId} not found`)

    console.log(`[COMPLIANCE] Fetching zones for Strava activity ${activity.external_id}`)
    const zonesResponse = await fetch(
      `https://www.strava.com/api/v3/activities/${activity.external_id}/zones`,
      { headers: { 'Authorization': `Bearer ${currentToken}` } }
    )

    if (!zonesResponse.ok) {
      throw new Error(`Strava API error fetching zones: ${zonesResponse.statusText}`)
    }
    
    const zonesData = await zonesResponse.json() as ZoneSummary[]

    // 3. Analyze Compliance
    // Logic: Compare "Time in Zones" against prescribed blocks in workout_snapshot
    
    // Extract target zones from workout snapshot blocks
    const targetZones = new Set<number>();
    const blocks = workoutSnapshot.blocks || [];
    blocks.forEach((b: WorkoutSnapshotBlock) => {
      if (b.intensity) {
        // If intensity is specified as a single number (e.g. Zone 2)
        if (typeof b.intensity === 'number') targetZones.add(b.intensity);
        // If intensity is a range or complex object, we'd need more logic here
      }
    });

    // Default to Z1-Z2 if no specific intensity was planned (recovery/base)
    if (targetZones.size === 0) {
      targetZones.add(1);
      targetZones.add(2);
    }

    const hrZones = zonesData.find((z) => z.type === 'heartrate');
    
    let complianceScore = 100;
    let isViolation = false;
    const violationDetails: ViolationDetails = { 
      targets: Array.from(targetZones), 
      distribution: [],
      primaryMetric: 'heartrate'
    };

    if (hrZones && hrZones.distribution) {
       const dist = hrZones.distribution; // array of { min, max, time }
       violationDetails.distribution = dist;
       
       let totalTime = 0;
       let timeInTargets = 0;
       let timeAboveTargets = 0;
       
       const maxTarget = Math.max(...Array.from(targetZones));

       dist.forEach((z: ZoneDistributionEntry, idx: number) => {
          totalTime += z.time;
          const zoneNum = idx + 1;
          
          if (targetZones.has(zoneNum)) {
             timeInTargets += z.time;
          } else if (zoneNum > maxTarget) {
             timeAboveTargets += z.time;
          }
       });
       
       // Calculate score based on time in prescribed zones vs total time
       complianceScore = totalTime > 0 ? (timeInTargets / totalTime) * 100 : 100;
       
       // Rule: If > 20% of the total time was spent in a zone HIGHER than the highest target, it's a violation
       if (totalTime > 0 && (timeAboveTargets / totalTime) > 0.20) {
          isViolation = true;
       }
    }

    // 4. Save Compliance Results
    console.log(`[COMPLIANCE] Result for ${activityId}: Score=${complianceScore.toFixed(1)}%, Violation=${isViolation}`)
    const { error: insertErr } = await supabase.from('activity_compliance').insert({
      activity_id: activityId,
      compliance_score: complianceScore,
      is_violation: isViolation,
      violation_details: violationDetails
    });

    if (insertErr) throw insertErr;

    // 5. Create Alert if Violation
    if (isViolation) {
       // Get coach_id from profiles
       const { data: profile } = await supabase
        .from('profiles')
        .select('coach_id, full_name')
        .eq('id', userId)
        .single();
       
       if (profile?.coach_id) {
          console.log(`[COMPLIANCE] Creating alert for coach ${profile.coach_id}`)
          await supabase.from('alerts').insert({
            coach_id: profile.coach_id,
            athlete_id: userId,
            activity_id: activityId,
            type: 'ZONE_VIOLATION',
            message: `¡Atención! ${profile.full_name} superó las zonas de intensidad prescritas (${complianceScore.toFixed(0)}% de cumplimiento).`
          });
       }
    }

    return new Response(JSON.stringify({ success: true, complianceScore, isViolation }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error(`[COMPLIANCE] Error: ${message}`)
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
