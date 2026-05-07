import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/api-helpers';

/**
 * Disconnect from Strava
 * 
 * Removes the Strava connection and all Strava-derived data from the database.
 * Note: Does NOT revoke the token on Strava's side.
 * 
 * Access: ATHLETE only
 */
export async function POST(request: NextRequest) {
    try {
        void request;
        const authResult = await requireRole('ATHLETE');

        if (authResult.response) {
            return authResult.response;
        }

        const { supabase, user } = authResult;

        const { error: activitiesError } = await supabase
            .from('activities')
            .delete()
            .eq('user_id', user!.id)
            .not('external_id', 'is', null);

        if (activitiesError) {
            console.error('Disconnect Strava activities purge error:', activitiesError);
            return NextResponse.json(
                { error: 'Failed to purge Strava activities' },
                { status: 500 }
            );
        }

        const { error: zonesError } = await supabase
            .from('athlete_profiles')
            .update({
                hr_zones: null,
                updated_at: new Date().toISOString(),
            })
            .eq('user_id', user!.id);

        if (zonesError) {
            console.error('Disconnect Strava zones purge error:', zonesError);
            return NextResponse.json(
                { error: 'Failed to purge Strava zones' },
                { status: 500 }
            );
        }

        const { error: logsError } = await supabase
            .from('sync_logs')
            .delete()
            .eq('user_id', user!.id);

        if (logsError) {
            console.error('Disconnect Strava logs purge error:', logsError);
            return NextResponse.json(
                { error: 'Failed to purge Strava sync logs' },
                { status: 500 }
            );
        }

        // Delete the connection last to prevent further refreshes
        const { error } = await supabase
            .from('strava_connections')
            .delete()
            .eq('user_id', user!.id);

        if (error) {
            console.error('Disconnect Strava error:', error);
            return NextResponse.json(
                { error: 'Failed to disconnect' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Successfully disconnected from Strava and deleted Strava data',
        });
    } catch (error: unknown) {
        console.error('Disconnect Strava error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
