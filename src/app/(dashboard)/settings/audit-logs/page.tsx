import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { AuditLogsList } from '@/features/settings/components/AuditLogsList';
import { AdminAuditLogItem } from '@/features/settings/services/audit-logs.service';
import { PageContainer } from '@/components/layout/PageContainer';

export const dynamic = 'force-dynamic';

export default async function AuditLogsPage() {
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

    // Fetch initial logs
    const { data: logs, count } = await supabase
        .from('admin_action_logs')
        .select('*', { count: 'exact' })
        .eq('team_id', profile.team_id)
        .order('created_at', { ascending: false })
        .range(0, 24);

    return (
        <PageContainer width="full">
            <AuditLogsList
                initialLogs={(logs || []) as unknown as AdminAuditLogItem[]}
                initialTotal={count || 0}
            />
        </PageContainer>
    );
}
