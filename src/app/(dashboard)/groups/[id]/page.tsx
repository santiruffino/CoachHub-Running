import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { GroupDetailsView } from '@/features/groups/components/GroupDetailsView';
import type { TrainingPlan } from '@/features/plans/types';
import { startOfWeek, addDays } from 'date-fns';

export const dynamic = 'force-dynamic';

export default async function GroupDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = await params;
    const id = resolvedParams.id;

    const supabase = await createClient();

    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
        redirect('/login');
    }

    // The group must be loaded first so we can scope the calendar to its members
    // (the calendar endpoint filters assignments by member user_id, not by a
    // group column — training_assignments has `source_group_id`, never `group_id`).
    const groupRes = await supabase
        .from('groups')
        .select(`
            *,
            race:races(*),
            members:athlete_groups(
                athlete:profiles(id, name, email)
            )
        `)
        .eq('id', id)
        .single();

    if (groupRes.error || !groupRes.data) {
        redirect('/groups');
    }

    const group = groupRes.data as Record<string, any>;

    // Map group members for initial view
    const groupMemberIds = new Set<string>(
        (group.members || [])
            .map((m: Record<string, any>) => m.athlete?.id)
            .filter((v: unknown): v is string => typeof v === 'string'),
    );
    const memberIds = Array.from(groupMemberIds);

    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });

    const [athletesRes, calendarRes, plansRes] = await Promise.all([
        supabase
            .from('profiles')
            .select(`
                id,
                email,
                name,
                role,
                created_at,
                athlete_groups(group_id)
            `)
            .eq('role', 'ATHLETE'),
        memberIds.length > 0
            ? supabase
                  .from('training_assignments')
                  .select(`
                    *,
                    training:trainings(*)
                `)
                  .in('user_id', memberIds)
                  .gte('scheduled_date', weekStart.toISOString())
                  .lte('scheduled_date', addDays(weekStart, 28).toISOString())
                  .order('scheduled_date', { ascending: true })
            : Promise.resolve({ data: [] as unknown[] }),
        supabase
            .from('training_plans')
            .select('*, training_plan_items(count)')
            .eq('is_archived', false)
            .order('updated_at', { ascending: false }),
    ]);
    const initialAthletes = (athletesRes.data || [])
        .filter((a) => groupMemberIds.has(a.id))
        .map((a) => ({
            id: a.id,
            name: a.name || a.email.split('@')[0],
            email: a.email,
            sport: 'Running', 
            level: 'Beginner', 
            totalTrainings: 0,
            plannedTrainings: 0,
            completedTrainings: 0,
            completionPercentage: 0
        }));

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <GroupDetailsView
                id={id}
                initialGroup={group as any}
                initialAthletes={initialAthletes as any}
                initialAssignments={calendarRes.data as any || []}
                initialPlans={(plansRes.data ?? []) as unknown as TrainingPlan[]}
            />
        </div>
    );
}
