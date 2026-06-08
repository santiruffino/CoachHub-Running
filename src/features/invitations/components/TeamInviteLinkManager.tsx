'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Check, Copy, MessageCircle, RefreshCw, Power, Link2, Loader2, AlertCircle } from 'lucide-react';
import { AlertDialog, useAlertDialog } from '@/components/ui/AlertDialog';
import { useApiError } from '@/hooks/useApiError';
import {
    teamInviteLinkService,
    type TeamInviteLink,
} from '@/features/invitations/services/team-invite-link.service';
import { appLogger } from '@/lib/app-logger';

const FIELD_LABEL =
    'text-[10px] uppercase tracking-widest text-endurix-black/50 dark:text-muted-foreground';

interface TeamInviteLinkManagerProps {
    /** Optional callback fired when the user wants to dismiss the parent modal. */
    onClose?: () => void;
}

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

export function TeamInviteLinkManager({ onClose }: TeamInviteLinkManagerProps) {
    const t = useTranslations('invitations.modals.athlete.teamLink');
    const { translateError } = useApiError();
    const { alertState, showAlert, closeAlert } = useAlertDialog();

    const [links, setLinks] = useState<TeamInviteLink[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [label, setLabel] = useState('');
    const [expiresInDays, setExpiresInDays] = useState<string>('');
    const [maxUses, setMaxUses] = useState<string>('');
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [activeId, setActiveId] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        const run = async () => {
            try {
                const { items } = await teamInviteLinkService.list();
                if (!cancelled) setLinks(items);
            } catch (err) {
                appLogger.error('team_invite_link.list_failed', err);
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

    const handleCreate = async () => {
        setCreating(true);
        try {
            const expires = expiresInDays.trim() ? Number(expiresInDays) : null;
            const max = maxUses.trim() ? Number(maxUses) : null;
            const created = await teamInviteLinkService.create({
                label: label.trim() || null,
                expiresInDays: Number.isFinite(expires as number) ? (expires as number | null) : null,
                maxUses: Number.isFinite(max as number) ? (max as number | null) : null,
            });
            setLinks((current) => [created, ...current]);
            setLabel('');
            setExpiresInDays('');
            setMaxUses('');
            setActiveId(created.id);
        } catch (err) {
            appLogger.error('team_invite_link.create_failed', err);
            showAlert('error', translateError(err));
        } finally {
            setCreating(false);
        }
    };

    const handleRevoke = async (id: string) => {
        try {
            const updated = await teamInviteLinkService.update(id, { isActive: false });
            setLinks((current) => current.map((l) => (l.id === id ? updated : l)));
        } catch (err) {
            appLogger.error('team_invite_link.revoke_failed', err);
            showAlert('error', translateError(err));
        }
    };

    const handleRotate = async (id: string) => {
        try {
            const fresh = await teamInviteLinkService.rotate(id);
            setLinks((current) => [fresh, ...current.map((l) => (l.id === id ? { ...l, isActive: false } : l))]);
            setActiveId(fresh.id);
        } catch (err) {
            appLogger.error('team_invite_link.rotate_failed', err);
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

    const whatsappUrl = (link: TeamInviteLink) => {
        const message = `${t('whatsappMessage')} ${link.externalUrl}`;
        return `https://wa.me/?text=${encodeURIComponent(message)}`;
    };

    return (
        <div className="space-y-6 pt-2">
            <Card className="border border-endurix-black/10 dark:border-border bg-endurix-paper dark:bg-card">
                <CardHeader className="border-b border-endurix-black/10 dark:border-border flex flex-row items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-endurix-black/8 dark:bg-white/8">
                            <Link2 className="h-4 w-4 text-endurix-orange" />
                        </div>
                        <div>
                            <CardTitle
                                className="text-base uppercase tracking-widest"
                                style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}
                            >
                                {t('createTitle')}
                            </CardTitle>
                            <CardDescription>{t('createDescription')}</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-6 grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2 sm:col-span-2">
                        <Label htmlFor="link-label" className={FIELD_LABEL} style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}>
                            {t('label')}
                        </Label>
                        <Input
                            id="link-label"
                            variant="boxed"
                            placeholder={t('labelPlaceholder')}
                            value={label}
                            onChange={(e) => setLabel(e.target.value)}
                            disabled={creating}
                            maxLength={120}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="link-expiry" className={FIELD_LABEL} style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}>
                            {t('expiry')}
                        </Label>
                        <Input
                            id="link-expiry"
                            variant="boxed"
                            type="number"
                            min={1}
                            placeholder={t('expiryPlaceholder')}
                            value={expiresInDays}
                            onChange={(e) => setExpiresInDays(e.target.value)}
                            disabled={creating}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="link-max-uses" className={FIELD_LABEL} style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}>
                            {t('maxUses')}
                        </Label>
                        <Input
                            id="link-max-uses"
                            variant="boxed"
                            type="number"
                            min={1}
                            placeholder={t('maxUsesPlaceholder')}
                            value={maxUses}
                            onChange={(e) => setMaxUses(e.target.value)}
                            disabled={creating}
                        />
                    </div>
                    <div className="sm:col-span-2 flex justify-end">
                        <Button
                            variant="orange"
                            className="uppercase tracking-widest text-[10px]"
                            onClick={handleCreate}
                            disabled={creating}
                        >
                            {creating ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t('creating')}
                                </>
                            ) : (
                                t('create')
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <div className="space-y-3">
                <h3
                    className="text-base uppercase tracking-widest"
                    style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}
                >
                    {t('listTitle')}
                </h3>

                {loading ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {t('loading')}
                    </div>
                ) : links.length === 0 ? (
                    <div className="text-sm text-muted-foreground border border-dashed border-endurix-black/15 dark:border-white/15 p-4 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        {t('empty')}
                    </div>
                ) : (
                    <ul className="space-y-3">
                        {links.map((link) => {
                            const expires = formatDate(link.expiresAt);
                            const isCopied = copiedId === link.id;
                            const isHighlighted = activeId === link.id;
                            return (
                                <li
                                    key={link.id}
                                    className={`border p-4 space-y-3 ${
                                        link.isActive
                                            ? isHighlighted
                                                ? 'border-emerald-500/40 bg-emerald-500/5'
                                                : 'border-endurix-black/10 dark:border-border bg-endurix-paper dark:bg-card'
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
                                            <p
                                                className="font-mono text-xs text-muted-foreground break-all"
                                            >
                                                {link.externalUrl}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-1">
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
                                        className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[10px] uppercase tracking-widest text-muted-foreground"
                                        style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}
                                    >
                                        <span>{t('uses', { count: link.uses, max: link.maxUses ?? '∞' })}</span>
                                        <span>
                                            {expires ? t('expiresAt', { date: expires }) : t('noExpiry')}
                                        </span>
                                        <span>{t('createdAt', { date: formatDate(link.createdAt) ?? '' })}</span>
                                    </div>

                                    {link.isActive && (
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
                                                asChild
                                                size="sm"
                                                className="bg-emerald-600 hover:bg-emerald-700 text-white uppercase tracking-widest text-[10px]"
                                            >
                                                <a
                                                    href={whatsappUrl(link)}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                >
                                                    <MessageCircle className="h-4 w-4 mr-1" />
                                                    {t('whatsapp')}
                                                </a>
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
                                            >
                                                <Power className="h-4 w-4 mr-1" />
                                                {t('revoke')}
                                            </Button>
                                        </div>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>

            {onClose && (
                <div className="flex justify-end pt-2">
                    <Button variant="orange" className="uppercase tracking-widest text-[10px]" onClick={onClose}>
                        {t('close')}
                    </Button>
                </div>
            )}

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
