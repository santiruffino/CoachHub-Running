import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { NotificationPreferencesForm } from '@/features/notifications/components/NotificationPreferencesForm';
import { SectionHeader } from '@/components/dashboard';
import { BackButton } from '@/components/ui/BackButton';

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
        <div className="max-w-4xl mx-auto space-y-8 pb-20 p-4 sm:p-6 lg:p-8">
            <div className="mb-4">
                <BackButton href="/settings" />
            </div>
            <SectionHeader
                eyebrow={t('eyebrow')}
                title={t('title')}
                description={t('description')}
            />

            <NotificationPreferencesForm />
        </div>
    );
}
