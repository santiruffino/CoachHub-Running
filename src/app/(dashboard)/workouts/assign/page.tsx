import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { AssignWorkoutView } from '@/features/trainings/components/AssignWorkoutView';

export const dynamic = 'force-dynamic';

export default async function AssignWorkoutPage({
    searchParams
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const resolvedParams = await searchParams;
    const athleteId = typeof resolvedParams.athleteId === 'string' ? resolvedParams.athleteId : null;
    const groupId = typeof resolvedParams.groupId === 'string' ? resolvedParams.groupId : null;
    const templateId = typeof resolvedParams.templateId === 'string' ? resolvedParams.templateId : null;
    const initialScheduledDate = typeof resolvedParams.date === 'string' ? resolvedParams.date : null;

    const supabase = await createClient();

    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
        redirect('/login');
    }

    // Parallel fetch initial data
    const [athletesRes, groupsRes, templatesRes, singleTemplateRes] = await Promise.all([
        supabase.from('profiles').select('id, name, email').eq('role', 'ATHLETE'),
        supabase.from('groups').select('id, name'),
        supabase.from('trainings').select('*').eq('is_template', true),
        templateId 
            ? supabase.from('trainings').select('*').eq('id', templateId).single()
            : Promise.resolve({ data: null })
    ]);

    return (
        <div className="min-h-screen bg-endurix-paper dark:bg-background p-0">
            <AssignWorkoutView
                initialAthletes={(athletesRes.data || []) as any}
                initialGroups={(groupsRes.data || []) as any}
                initialTemplates={(templatesRes.data || []) as any}
                preselectedAthleteId={athleteId}
                preselectedGroupId={groupId}
                initialScheduledDate={initialScheduledDate}
                initialTemplate={singleTemplateRes.data as any}
            />
        </div>
    );
}
