import { createClient } from '@/lib/supabase/server';
import { createLogger } from '@/lib/logger';

/**
 * Team branding as consumed by shared chrome (Navbar, MobileHeader).
 * A `null` field means "no custom value set — fall back to the app default".
 * This is intentionally not run through `normalizeTeamSettings`, whose defaults
 * ('Endurix Team', etc.) would mask whether the team actually customized branding.
 */
export interface TeamBranding {
    teamName: string | null;
    logoUrl: string | null;
    primaryColor: string | null;
}

export const EMPTY_TEAM_BRANDING: TeamBranding = {
    teamName: null,
    logoUrl: null,
    primaryColor: null,
};

function toDisplayValue(value: unknown): string | null {
    return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

/**
 * Reads the current user's team branding for display in shared chrome.
 * Readable by any authenticated team member (RLS: `team_id = get_my_team_id()`),
 * so athletes see their coach's branding too. Never throws — returns
 * `EMPTY_TEAM_BRANDING` on any missing user/team/row or error.
 */
export async function getCurrentTeamBranding(): Promise<TeamBranding> {
    const logger = createLogger({ route: 'team-branding.server' });

    try {
        const supabase = await createClient();

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) return EMPTY_TEAM_BRANDING;

        const { data: profile } = await supabase
            .from('profiles')
            .select('team_id')
            .eq('id', user.id)
            .single();

        if (!profile?.team_id) return EMPTY_TEAM_BRANDING;

        const { data } = await supabase
            .from('team_settings')
            .select('branding')
            .eq('team_id', profile.team_id)
            .maybeSingle();

        const branding = (data?.branding || {}) as Record<string, unknown>;

        return {
            teamName: toDisplayValue(branding.teamName),
            logoUrl: toDisplayValue(branding.logoUrl),
            primaryColor: toDisplayValue(branding.primaryColor),
        };
    } catch (error) {
        logger.warn('team_branding.fetch_failed', { error });
        return EMPTY_TEAM_BRANDING;
    }
}
