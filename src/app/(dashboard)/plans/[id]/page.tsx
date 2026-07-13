import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import { PageContainer } from '@/components/layout/PageContainer';
import { PlanBuilder } from '@/features/plans/components/PlanBuilder';
import type { Training } from '@/interfaces/training';
import type { TrainingPlan } from '@/features/plans/types';

export const dynamic = 'force-dynamic';

export default async function EditPlanPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const supabase = await createClient();

    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
        redirect('/login');
    }

    const [planRes, templatesRes] = await Promise.all([
        supabase
            .from('training_plans')
            .select(
                `*, items:training_plan_items(
                    id, training_id, week_index, day_of_week, workout_name, expected_rpe, sort_order, blocks,
                    training:trainings(id, title, description, type, blocks, team_id)
                )`,
            )
            .eq('id', id)
            .maybeSingle(),
        supabase
            .from('trainings')
            .select('id, title, description, type, blocks')
            .eq('is_template', true)
            .order('created_at', { ascending: false }),
    ]);

    if (!planRes.data) {
        notFound();
    }

    return (
        <PageContainer width="wide">
            <PlanBuilder
                initialPlan={planRes.data as TrainingPlan}
                templates={(templatesRes.data || []) as Training[]}
            />
        </PageContainer>
    );
}
