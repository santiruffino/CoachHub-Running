import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Sync heart rate zones from Strava to athlete profile
 * 
 * This is a helper function that can be called during Strava connection
 * or sync operations to automatically update zones.
 * 
 * @param accessToken - Valid Strava access token
 * @param supabase - Supabase client instance
 * @param userId - User ID to update zones for
 * @returns Success status and zones data, or null on error
 */
export async function syncHeartRateZonesFromStrava(
    accessToken: string,
    supabase: SupabaseClient,
    userId: string
): Promise<{ success: boolean; zones?: any; error?: string }> {
    try {
        // Fetch athlete zones from Strava
        const zonesResponse = await fetch(
            'https://www.strava.com/api/v3/athlete/zones',
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                },
            }
        );

        if (!zonesResponse.ok) {
            console.error('Failed to fetch zones from Strava:', zonesResponse.status);
            return {
                success: false,
                error: 'Failed to fetch zones from Strava'
            };
        }

        const zonesData = await zonesResponse.json();
        const heartRateZones = zonesData.heart_rate;

        if (!heartRateZones || !heartRateZones.zones) {
            console.log('No heart rate zones found in Strava profile');
            return {
                success: false,
                error: 'No heart rate zones found'
            };
        }

        // Transform zones to our format
        const hrZones = {
            zones: heartRateZones.zones.map((zone: any) => ({
                min: zone.min,
                max: zone.max,
            })),
            custom_zones: heartRateZones.custom_zones,
        };

        // Update athlete profile with zones
        const { error: updateError } = await supabase
            .from('athlete_profiles')
            .upsert({
                user_id: userId,
                hr_zones: hrZones,
                updated_at: new Date().toISOString(),
            }, {
                onConflict: 'user_id'
            });

        if (updateError) {
            console.error('Failed to update zones in profile:', updateError);
            return {
                success: false,
                error: 'Failed to update zones in database'
            };
        }

        return {
            success: true,
            zones: hrZones
        };
    } catch (error: any) {
        console.error('Error syncing heart rate zones:', error);
        return {
            success: false,
            error: error.message
        };
    }
}
