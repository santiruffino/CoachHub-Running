import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/api-helpers';

/**
 * Disconnect from Strava
 * 
 * Removes the Strava connection from the database.
 * Note: Does NOT revoke the token on Strava's side.
 * 
 * Access: ATHLETE only
 */
export async function POST(request: NextRequest) {
    try {
        const authResult = await requireRole('ATHLETE');

        if (authResult.response) {
            return authResult.response;
        }

        const { supabase, user } = authResult;

        // Delete the connection
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
            message: 'Successfully disconnected from Strava',
        });
    } catch (error: any) {
        console.error('Disconnect Strava error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
