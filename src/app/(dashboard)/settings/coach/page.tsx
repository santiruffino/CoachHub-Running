import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { CoachSettingsForm } from '@/features/settings/components/CoachSettingsForm';
import { CoachSettings } from '@/features/settings/types';
import { normalizeCoachSettings } from '@/lib/settings/defaults';

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

    // Fetch coach settings (stored as JSONB payloads)
    const { data: settingsData } = await supabase
        .from('coach_settings')
        .select('thresholds, default_models, preferences')
        .eq('coach_id', user.id)
        .maybeSingle();

    const initialSettings: CoachSettings = normalizeCoachSettings({
        thresholds: settingsData?.thresholds,
        default_models: settingsData?.default_models,
        preferences: settingsData?.preferences,
    });

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <CoachSettingsForm initialSettings={initialSettings} />
        </div>
    );
}
