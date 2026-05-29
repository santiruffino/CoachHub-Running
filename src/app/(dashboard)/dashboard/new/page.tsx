import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import CoachDashboardNew from '../components/CoachDashboardNew';
import { User } from '@/interfaces/auth';

export const dynamic = 'force-dynamic';

export default async function NewDashboardPage() {
    const supabase = await createClient();

    const {
        data: { user: authUser },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !authUser) {
        redirect('/login');
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

    if (!profile) {
        redirect('/login');
    }

    if (profile.role !== 'COACH' && profile.role !== 'ADMIN') {
        redirect('/dashboard');
    }

    const user: User = {
        id: profile.id,
        email: profile.email,
        name: profile.name,
        firstName: profile.first_name,
        lastName: profile.last_name,
        role: profile.role,
        isOnboardingCompleted: profile.is_onboarding_completed
    };

    return <CoachDashboardNew user={user} />;
}
