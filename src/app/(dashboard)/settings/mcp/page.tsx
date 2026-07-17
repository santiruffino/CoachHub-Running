import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { McpConnectionGuide } from '@/features/settings/components/McpConnectionGuide';
import { getSiteUrl } from '@/lib/seo';

export const dynamic = 'force-dynamic';

export default async function McpSettingsPage() {
    const supabase = await createClient();
    const t = await getTranslations('settings.mcp');

    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
        redirect('/login');
    }

    // MCP tools are coach/admin-scoped, so gate the guide to those roles.
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (!profile || (profile.role !== 'COACH' && profile.role !== 'ADMIN')) {
        redirect('/dashboard');
    }

    const endpoint = `${getSiteUrl()}/api/mcp`;

    return (
        <PageContainer width="narrow" className="space-y-8 pb-20">
            <PageHeader
                backHref="/settings"
                eyebrow={t('eyebrow')}
                title={t('title')}
                description={t('description')}
            />
            <McpConnectionGuide endpoint={endpoint} />
        </PageContainer>
    );
}
