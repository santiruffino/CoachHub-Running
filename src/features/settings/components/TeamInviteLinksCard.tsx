'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link2, RefreshCw, Power, Check, Copy, Loader2 } from 'lucide-react';
import { SectionHeader, DashboardCardHeaderDots } from '@/components/dashboard';
import { AlertDialog, useAlertDialog } from '@/components/ui/AlertDialog';
import { useApiError } from '@/hooks/useApiError';
import {
    teamInviteLinkService,
    type TeamInviteLink,
} from '@/features/invitations/services/team-invite-link.service';
import { appLogger } from '@/lib/app-logger';

const FIELD_LABEL =
    'text-[10px] uppercase tracking-widest text-endurix-black/50 dark:text-muted-foreground';

function formatDate(value: string | null): string | null {
    if (!value) return null;
    try {
        return new Date(value).toLocaleDateString('es-AR', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });
    } catch {
        return value;
    }
}

export function TeamInviteLinksCard() {
    const t = useTranslations('invitations.teamLinkCard');
    const { translateError } = useApiError();
    const { alertState, showAlert, closeAlert } = useAlertDialog();

    const [links, setLinks] = useState<TeamInviteLink[]>([]);
    const [loading, setLoading] = useState(true);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        const run = async () => {
            try {
                const { items } = await teamInviteLinkService.list();
                if (!cancelled) setLinks(items);
            } catch (err) {
                appLogger.error('team_invite_link.admin_list_failed', err);
                if (!cancelled) showAlert('error', translateError(err));
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        run();
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleRevoke = async (id: string) => {
        try {
            const updated = await teamInviteLinkService.update(id, { isActive: false });
            setLinks((current) => current.map((l) => (l.id === id ? updated : l)));
        } catch (err) {
            appLogger.error('team_invite_link.admin_revoke_failed', err);
            showAlert('error', translateError(err));
        }
    };

    const handleRotate = async (id: string) => {
        try {
            const fresh = await teamInviteLinkService.rotate(id);
            setLinks((current) => [fresh, ...current.map((l) => (l.id === id ? { ...l, isActive: false } : l))]);
        } catch (err) {
            appLogger.error('team_invite_link.admin_rotate_failed', err);
            showAlert('error', translateError(err));
        }
    };

    const copy = async (link: TeamInviteLink) => {
        try {
            await navigator.clipboard.writeText(link.externalUrl);
            setCopiedId(link.id);
            setTimeout(() => setCopiedId((curr) => (curr === link.id ? null : curr)), 2000);
        } catch {
            showAlert('error', t('copyError'));
        }
    };

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <SectionHeader
                eyebrow={t('eyebrow')}
                title={t('title')}
                description={t('description')}
            />

            <Card className="bg-endurix-paper dark:bg-card border border-endurix-black/10 dark:border-border">
                <CardHeader className="border-b border-endurix-black/10 dark:border-border flex flex-row items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-endurix-black/8 dark:bg-white/8">
                            <Link2 className="h-4 w-4 text-endurix-orange" />
                        </div>
                        <CardTitle
                            className="text-base uppercase tracking-widest"
                            style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}
                        >
                            {t('cardTitle')}
                        </CardTitle>
                    </div>
                    <DashboardCardHeaderDots />
                </CardHeader>
                <CardContent className="p-6">
                    {loading ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            {t('loading')}
                        </div>
                    ) : links.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-4">{t('empty')}</p>
                    ) : (
                        <ul className="space-y-3">
                            {links.map((link) => {
                                const expires = formatDate(link.expiresAt);
                                const isCopied = copiedId === link.id;
                                return (
                                    <li
                                        key={link.id}
                                        className={`border p-4 space-y-2 ${
                                            link.isActive
                                                ? 'border-endurix-black/10 dark:border-border bg-background'
                                                : 'border-endurix-black/10 dark:border-border bg-muted opacity-70'
                                        }`}
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="space-y-1">
                                                <p
                                                    className="text-sm font-semibold"
                                                    style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}
                                                >
                                                    {link.label || t('defaultLabel')}
                                                </p>
                                                <p className={`font-mono text-xs ${FIELD_LABEL} break-all`}>
                                                    {link.externalUrl}
                                                </p>
                                            </div>
                                            <div>
                                                {link.isActive ? (
                                                    <span className="text-[10px] uppercase tracking-widest text-emerald-600 dark:text-emerald-400 px-2 py-1 bg-emerald-500/10 border border-emerald-500/30">
                                                        {t('statusActive')}
                                                    </span>
                                                ) : (
                                                    <span className="text-[10px] uppercase tracking-widest text-muted-foreground px-2 py-1 bg-muted border border-endurix-black/10">
                                                        {t('statusInactive')}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div
                                            className={`grid grid-cols-2 sm:grid-cols-3 gap-2 ${FIELD_LABEL}`}
                                            style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}
                                        >
                                            <span>{t('uses', { count: link.uses, max: link.maxUses ?? '∞' })}</span>
                                            <span>{expires ? t('expiresAt', { date: expires }) : t('noExpiry')}</span>
                                            <span>{t('createdAt', { date: formatDate(link.createdAt) ?? '' })}</span>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            <Button
                                                size="sm"
                                                variant="outline-brand"
                                                className="uppercase tracking-widest text-[10px]"
                                                onClick={() => copy(link)}
                                            >
                                                {isCopied ? (
                                                    <>
                                                        <Check className="h-4 w-4 mr-1 text-emerald-600" />
                                                        {t('copied')}
                                                    </>
                                                ) : (
                                                    <>
                                                        <Copy className="h-4 w-4 mr-1" />
                                                        {t('copy')}
                                                    </>
                                                )}
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline-brand"
                                                className="uppercase tracking-widest text-[10px]"
                                                onClick={() => handleRotate(link.id)}
                                            >
                                                <RefreshCw className="h-4 w-4 mr-1" />
                                                {t('rotate')}
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline-brand"
                                                className="uppercase tracking-widest text-[10px] text-destructive"
                                                onClick={() => handleRevoke(link.id)}
                                                disabled={!link.isActive}
                                            >
                                                <Power className="h-4 w-4 mr-1" />
                                                {t('revoke')}
                                            </Button>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </CardContent>
            </Card>

            <AlertDialog
                open={alertState.open}
                onClose={closeAlert}
                type={alertState.type}
                title={alertState.title}
                message={alertState.message}
                confirmText={alertState.confirmText}
            />
        </div>
    );
}
