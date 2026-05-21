import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { CoachSettingsForm } from '@/features/settings/components/CoachSettingsForm';
import { CoachSettings } from '@/features/settings/types';

export const dynamic = 'force-dynamic';

export default async function CoachSettingsPage() {
    const supabase = await createClient();

    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
        redirect('/login');
    }

    // Check if user is coach
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (!profile || profile.role !== 'COACH') {
        redirect('/dashboard');
    }

    // Fetch coach settings
    const { data: settingsData } = await supabase
        .from('coach_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

    const initialSettings: CoachSettings = settingsData ? {
        thresholds: {
            rpeMismatchThreshold: settingsData.rpe_mismatch_threshold,
            lowComplianceThreshold: settingsData.low_compliance_threshold,
        },
        defaultModels: {
            workoutMatcherModel: settingsData.workout_matcher_model,
            complianceModel: settingsData.compliance_model,
        },
    } : {
        thresholds: { rpeMismatchThreshold: 2, lowComplianceThreshold: 50 },
        defaultModels: { workoutMatcherModel: 'baseline-v1', complianceModel: 'baseline-v1' },
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <CoachSettingsForm initialSettings={initialSettings} />
        </div>
    );
}
