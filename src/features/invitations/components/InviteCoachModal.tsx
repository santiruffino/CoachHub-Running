'use client';
import { appLogger } from '@/lib/app-logger';


import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslations } from 'next-intl';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import api from '@/lib/axios';
import { Check, Copy, MessageCircle } from 'lucide-react';
import { AlertDialog, useAlertDialog } from '@/components/ui/AlertDialog';
import { trackInvitationCreated } from '@/lib/analytics/events';
import { useApiError } from '@/hooks/useApiError';

interface InviteCoachModalProps {
    open: boolean;
    onClose: () => void;
}

interface InviteFormData {
    email: string;
}

export function InviteCoachModal({ open, onClose }: InviteCoachModalProps) {
    const tCoach = useTranslations('invitations.modals.coach');
    const tCommon = useTranslations('invitations.modals.common');
    const { register, handleSubmit, reset, formState: { errors } } = useForm<InviteFormData>();
    const { translateError } = useApiError();
    const [creating, setCreating] = useState(false);
    const [invitationLink, setInvitationLink] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const { alertState, showAlert, closeAlert } = useAlertDialog();

    const onSubmit = async (data: InviteFormData) => {
        setCreating(true);
        try {
            const response = await api.post('/v2/invitations', {
                email: data.email,
                role: 'COACH',
            });

            trackInvitationCreated({ role: 'COACH' });

            // Generate invitation link
            const link = `${window.location.origin}/accept-invitation?token=${response.data.token}`;
            setInvitationLink(link);
        } catch (error: unknown) {
            appLogger.error('Failed to create invitation:', error);
            showAlert('error', translateError(error));
        } finally {
            setCreating(false);
        }
    };

    const copyToClipboard = () => {
        if (invitationLink) {
            navigator.clipboard.writeText(invitationLink);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleClose = () => {
        reset();
        setInvitationLink(null);
        setCopied(false);
        onClose();
    };

    const getWhatsAppShareUrl = () => {
        if (!invitationLink) return '#';

        const message = `Hola! Te invito a unirte como coach en Endurix. Usa este enlace para aceptar la invitacion: ${invitationLink}`;
        return `https://wa.me/?text=${encodeURIComponent(message)}`;
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-md bg-endurix-paper dark:bg-card border border-endurix-black/15 dark:border-border">
                <DialogHeader>
                    <DialogTitle className="uppercase tracking-widest text-base" style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}>{tCoach('title')}</DialogTitle>
                    <DialogDescription>
                        {invitationLink
                            ? tCoach('descriptionCreated')
                            : tCoach('descriptionCreate')}
                    </DialogDescription>
                </DialogHeader>

                {!invitationLink ? (
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-4">
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-[10px] uppercase tracking-widest text-endurix-black/50 dark:text-muted-foreground" style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}>{tCommon('email')}</Label>
                            <div className="flex gap-2">
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder={tCoach('emailPlaceholder')}
                                    variant="boxed"
                                    {...register('email', {
                                        required: tCommon('emailRequired'),
                                        pattern: {
                                            value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                                            message: tCommon('emailInvalid'),
                                        },
                                    })}
                                />
                            </div>
                            {errors.email && (
                                <p className="text-sm text-destructive">{errors.email.message as string}</p>
                            )}
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <Button type="button" variant="outline-brand" className="uppercase tracking-widest text-[10px]" onClick={handleClose}>
                                {tCommon('cancel')}
                            </Button>
                            <Button type="submit" variant="orange" className="uppercase tracking-widest text-[10px]" disabled={creating}>
                                {creating ? tCommon('creating') : tCoach('create')}
                            </Button>
                        </div>
                    </form>
                ) : (
                    <div className="space-y-4 pt-4">
                        <div className="space-y-2">
                            <Label className="text-[10px] uppercase tracking-widest text-endurix-black/50 dark:text-muted-foreground" style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}>{tCommon('linkLabel')}</Label>
                            <div className="flex gap-2">
                                <Input value={invitationLink} readOnly variant="boxed" className="font-mono text-xs" />
                                <Button
                                    type="button"
                                    size="icon"
                                    variant="outline-brand"
                                    onClick={copyToClipboard}
                                >
                                    {copied ? (
                                        <Check className="h-4 w-4 text-emerald-600" />
                                    ) : (
                                        <Copy className="h-4 w-4" />
                                    )}
                                </Button>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {tCommon('linkExpires')}
                            </p>
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <Button asChild className="bg-emerald-600 hover:bg-emerald-700 text-white uppercase tracking-widest text-[10px]">
                                <a
                                    href={getWhatsAppShareUrl()}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    <MessageCircle className="h-4 w-4 mr-2" />
                                    {tCommon('sendWhatsapp')}
                                </a>
                            </Button>
                            <Button variant="orange" className="uppercase tracking-widest text-[10px]" onClick={handleClose}>{tCommon('close')}</Button>
                        </div>
                    </div>
                )}
            </DialogContent>

            <AlertDialog
                open={alertState.open}
                onClose={closeAlert}
                type={alertState.type}
                title={alertState.title}
                message={alertState.message}
                confirmText={alertState.confirmText}
            />
        </Dialog>
    );
}
