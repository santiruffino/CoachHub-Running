import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { PageContainer } from '@/components/layout/PageContainer';
import { PlanBuilder } from '@/features/plans/components/PlanBuilder';
import type { Training } from '@/interfaces/training';

export const dynamic = 'force-dynamic';

export default async function NewPlanPage() {
    const supabase = await createClient();

    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
        redirect('/login');
    }

    const { data: templates } = await supabase
        .from('trainings')
        .select('id, title, description, type, blocks')
        .eq('is_template', true)
        .order('created_at', { ascending: false });

    return (
        <PageContainer width="wide">
            <PlanBuilder templates={(templates || []) as Training[]} />
        </PageContainer>
    );
}
