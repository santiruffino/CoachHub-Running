import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { TeamSettingsForm } from '@/features/settings/components/TeamSettingsForm';
import { TeamSettings } from '@/features/settings/types';

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

    // Fetch team settings
    const { data: settingsData } = await supabase
        .from('team_settings')
        .select('*')
        .eq('team_id', profile.team_id)
        .single();

    const initialSettings: TeamSettings = settingsData ? {
        thresholds: {
            rpeMismatchThreshold: settingsData.rpe_mismatch_threshold,
            lowComplianceThreshold: settingsData.low_compliance_threshold,
        },
        branding: {
            teamName: settingsData.team_name,
            logoUrl: settingsData.logo_url,
            primaryColor: settingsData.primary_color,
        },
        defaultModels: {
            workoutMatcherModel: settingsData.workout_matcher_model,
            complianceModel: settingsData.compliance_model,
        },
    } : {
        thresholds: { rpeMismatchThreshold: 2, lowComplianceThreshold: 50 },
        branding: { teamName: 'Endurix Team', logoUrl: '', primaryColor: '#1f2937' },
        defaultModels: { workoutMatcherModel: 'baseline-v1', complianceModel: 'baseline-v1' },
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <TeamSettingsForm initialSettings={initialSettings} />
        </div>
    );
}
