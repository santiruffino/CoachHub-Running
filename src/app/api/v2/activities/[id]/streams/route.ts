import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/v2/activities/[id]/streams
 * Proxy route for the Supabase Edge Function 'fetch-strava-streams'
 * Includes caching in the 'activity_streams' table.
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: externalId } = await params;
        const supabase = await createClient();
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseAnonKey) {
            console.error('[STREAMS] Missing Supabase environment variables');
            return NextResponse.json(
                { error: 'Server configuration error' },
                { status: 500 }
            );
        }

        // 1. Check local cache first (activity_streams table)
        const { data: cachedStream, error: cacheError } = await supabase
            .from('activity_streams')
            .select('stream_data')
            .eq('external_id', externalId)
            .maybeSingle();

        if (cachedStream) {
            console.log(`[STREAMS] Cache hit for activity: ${externalId}`);
            return NextResponse.json(cachedStream.stream_data);
        }

        // 2. Cache miss: Call the Supabase Edge Function
        // This function handles permissions, Strava token refresh, and persistence
        const functionUrl = `${supabaseUrl}/functions/v1/fetch-strava-streams?id=${encodeURIComponent(externalId)}`;
        
        console.log(`[STREAMS] Cache miss. Calling Edge Function: ${functionUrl}`);

        const response = await fetch(functionUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`,
                'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
            },
        });

        if (!response.ok) {
            console.error(`[STREAMS] Edge Function returned error: ${response.status}`);
            let errorData;
            try {
                errorData = await response.json();
            } catch (e) {
                errorData = { error: 'Failed to parse error response', details: await response.text().catch(() => 'No text body') };
            }
            return NextResponse.json(errorData, { status: response.status });
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error: any) {
        console.error('Streams API error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
