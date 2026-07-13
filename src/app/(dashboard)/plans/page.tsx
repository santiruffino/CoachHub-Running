import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { PageContainer } from '@/components/layout/PageContainer';
import { PlansList } from '@/features/plans/components/PlansList';
import type { TrainingPlan } from '@/features/plans/types';

export const dynamic = 'force-dynamic';

export default async function PlansPage() {
    const supabase = await createClient();

    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
        redirect('/login');
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('team_id')
        .eq('id', user.id)
        .single();

    const [plansRes, athletesRes, groupsRes] = await Promise.all([
        supabase
            .from('training_plans')
            .select('*, training_plan_items(count)')
            .eq('is_archived', false)
            .order('updated_at', { ascending: false }),
        supabase.from('profiles').select('id, name, email').eq('role', 'ATHLETE').eq('team_id', profile?.team_id ?? ''),
        supabase.from('groups').select('id, name').eq('team_id', profile?.team_id ?? ''),
    ]);

    return (
        <PageContainer>
            <PlansList
                initialPlans={(plansRes.data || []) as TrainingPlan[]}
                athletes={(athletesRes.data || []) as { id: string; name: string; email: string }[]}
                groups={(groupsRes.data || []) as { id: string; name: string }[]}
            />
        </PageContainer>
    );
}
