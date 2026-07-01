import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Bell, Shield, Users, UserCog } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { SectionHeader } from '@/components/dashboard';
import { BackButton } from '@/components/ui/BackButton';

export const dynamic = 'force-dynamic';

interface SettingsTile {
    href: string;
    icon: typeof Bell;
    title: string;
    description: string;
}

export default async function SettingsHubPage() {
    const supabase = await createClient();
    const t = await getTranslations('settings.hub');

    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
        redirect('/login');
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    const role = profile?.role;

    const tiles: SettingsTile[] = [
        {
            href: '/settings/notifications',
            icon: Bell,
            title: t('tiles.notifications.title'),
            description: t('tiles.notifications.description'),
        },
        ...(role === 'COACH'
            ? [{
                href: '/settings/coach',
                icon: UserCog,
                title: t('tiles.coach.title'),
                description: t('tiles.coach.description'),
            }]
            : []),
        ...(role === 'ADMIN'
            ? [{
                href: '/settings/team',
                icon: Users,
                title: t('tiles.team.title'),
                description: t('tiles.team.description'),
            }]
            : []),
        ...(role === 'ADMIN'
            ? [{
                href: '/settings/audit-logs',
                icon: Shield,
                title: t('tiles.auditLogs.title'),
                description: t('tiles.auditLogs.description'),
            }]
            : []),
    ];

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-20 p-4 sm:p-6 lg:p-8">
            <div className="mb-4">
                <BackButton href="/dashboard" />
            </div>
            <SectionHeader
                eyebrow={t('eyebrow')}
                title={t('title')}
                description={t('description')}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {tiles.map((tile) => {
                    const Icon = tile.icon;
                    return (
                        <Link
                            key={tile.href}
                            href={tile.href}
                            className="group flex items-start gap-4 border border-endurix-black/10 dark:border-border bg-white dark:bg-card p-5 transition-colors hover:border-endurix-orange/40"
                        >
                            <div className="p-2 bg-endurix-black/8 dark:bg-white/8 shrink-0">
                                <Icon className="h-4 w-4 text-endurix-orange" />
                            </div>
                            <div>
                                <h4
                                    className="text-sm font-bold uppercase tracking-widest text-endurix-black dark:text-foreground group-hover:text-endurix-orange transition-colors"
                                    style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}
                                >
                                    {tile.title}
                                </h4>
                                <p className="mt-1 text-sm text-muted-foreground">{tile.description}</p>
                            </div>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
