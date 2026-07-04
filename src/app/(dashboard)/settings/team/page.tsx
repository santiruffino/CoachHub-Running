import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { TeamSettingsForm } from '@/features/settings/components/TeamSettingsForm';
import { TeamSettings } from '@/features/settings/types';
import { TeamInviteLinksCard } from '@/features/settings/components/TeamInviteLinksCard';
import { normalizeTeamSettings } from '@/lib/settings/defaults';
import { PageContainer } from '@/components/layout/PageContainer';

export const dynamic = 'force-dynamic';

export default async function TeamSettingsPage() {
    const supabase = await createClient();

    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
        redirect('/login');
    }

    // Check if user is admin
    const { data: profile } = await supabase
        .from('profiles')
        .select('role, team_id')
        .eq('id', user.id)
        .single();

    if (!profile || profile.role !== 'ADMIN') {
        redirect('/dashboard');
    }

    // Fetch team settings (stored as JSONB payloads)
    const { data: settingsData } = await supabase
        .from('team_settings')
        .select('thresholds, branding, default_models, max_athletes')
        .eq('team_id', profile.team_id)
        .maybeSingle();

    const initialSettings: TeamSettings = normalizeTeamSettings({
        thresholds: settingsData?.thresholds,
        branding: settingsData?.branding,
        default_models: settingsData?.default_models,
        limits: { maxAthletes: settingsData?.max_athletes ?? null },
    });

    return (
        <PageContainer width="full" className="space-y-6">
            <TeamSettingsForm initialSettings={initialSettings} />
            <TeamInviteLinksCard />
        </PageContainer>
    );
}
