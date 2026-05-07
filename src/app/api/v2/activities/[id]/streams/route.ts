import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import * as Sentry from '@sentry/nextjs';
import { createRequestLogger, withRequestId } from '@/lib/logger';

/**
 * GET /api/v2/activities/[id]/streams
 * Proxy route for the Supabase Edge Function 'fetch-strava-streams'
 * Includes caching in the 'activity_streams' table.
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { requestId, logger } = createRequestLogger('/api/v2/activities/[id]/streams', request);

    const respond = (body: unknown, init?: ResponseInit) =>
        NextResponse.json(body, withRequestId(init, requestId));

    try {
        void request;
        const { id: activityUuid } = await params;
        const supabase = await createClient();
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
            logger.warn('streams.unauthorized');
            return respond({ error: 'Unauthorized' }, { status: 401 });
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseAnonKey) {
            logger.error('streams.missing_supabase_env');
            return respond(
                { error: 'Server configuration error' },
                { status: 500 }
            );
        }

        // 1. Check local cache first (activity_streams table) using UUID
        const { data: cachedStream } = await supabase
            .from('activity_streams')
            .select('stream_data')
            .eq('activity_id', activityUuid)
            .maybeSingle();

        if (cachedStream) {
            logger.debug('streams.cache_hit', { activityId: activityUuid });
            return respond(cachedStream.stream_data, { status: 200 });
        }

        // 2. Cache miss: Call the Supabase Edge Function
        // This function handles permissions, Strava token refresh, and persistence
        const functionUrl = `${supabaseUrl}/functions/v1/fetch-strava-streams?uuid=${encodeURIComponent(activityUuid)}`;
        
        logger.info('streams.cache_miss_call_edge_function', { activityId: activityUuid });

        const response = await fetch(functionUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`,
                'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
            },
        });

        if (!response.ok) {
            logger.error('streams.edge_function_error', {
                activityId: activityUuid,
                status: response.status,
            });
            return respond(
                { error: 'Failed to load activity streams' },
                { status: response.status }
            );
        }

        const data = await response.json();
        return respond(data, { status: 200 });
    } catch (error: unknown) {
        logger.error('streams.unhandled_error', { error });
        Sentry.captureException(error, {
            tags: { route: '/api/v2/activities/[id]/streams', requestId },
        });
        return respond(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
