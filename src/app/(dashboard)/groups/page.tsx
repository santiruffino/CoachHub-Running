import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { GroupsList } from '@/features/groups/components/GroupsList';
import { PageContainer } from '@/components/layout/PageContainer';

export const dynamic = 'force-dynamic';

export default async function GroupsPage() {
    const supabase = await createClient();

    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
        redirect('/login');
    }

    // Check if user is a coach or admin
    const { data: profile } = await supabase
        .from('profiles')
        .select('role, team_id')
        .eq('id', user.id)
        .single();

    if (!profile || (profile.role !== 'COACH' && profile.role !== 'ADMIN')) {
        redirect('/dashboard');
    }

    // Get all groups for this coach or team
    let groupsQuery = supabase
        .from('groups')
        .select(`
            *,
            race:races(*),
            _count:athlete_groups(count)
        `)
        .order('created_at', { ascending: false });

    if (profile.role === 'ADMIN' || profile.role === 'COACH') {
        groupsQuery = groupsQuery.eq('team_id', profile.team_id);
    }

    const { data: groups, error } = await groupsQuery;

    if (error) {
        return (
            <div className="p-8 text-center text-muted-foreground">
                Failed to load groups. Please try again later.
            </div>
        );
    }

    return (
        <PageContainer>
            <GroupsList initialGroups={groups || []} />
        </PageContainer>
    );
}
