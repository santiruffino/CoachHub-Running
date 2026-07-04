import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { NotificationPreferencesForm } from '@/features/notifications/components/NotificationPreferencesForm';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';

export const dynamic = 'force-dynamic';

export default async function NotificationSettingsPage() {
    const supabase = await createClient();
    const t = await getTranslations('settings.notifications');

    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
        redirect('/login');
    }

    return (
        <PageContainer width="narrow" className="space-y-8 pb-20">
            <PageHeader
                backHref="/settings"
                eyebrow={t('eyebrow')}
                title={t('title')}
                description={t('description')}
            />

            <NotificationPreferencesForm />
        </PageContainer>
    );
}
