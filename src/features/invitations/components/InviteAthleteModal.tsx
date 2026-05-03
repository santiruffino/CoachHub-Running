'use client';

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

interface InviteAthleteModalProps {
    open: boolean;
    onClose: () => void;
}

interface InviteFormData {
    email: string;
}

export function InviteAthleteModal({ open, onClose }: InviteAthleteModalProps) {
    const tAthlete = useTranslations('invitations.modals.athlete');
    const tCommon = useTranslations('invitations.modals.common');
    const { register, handleSubmit, reset, formState: { errors } } = useForm<InviteFormData>();
    const [creating, setCreating] = useState(false);
    const [invitationLink, setInvitationLink] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const { alertState, showAlert, closeAlert } = useAlertDialog();

    const onSubmit = async (data: InviteFormData) => {
        setCreating(true);
        try {
            const response = await api.post('/invitations', {
                email: data.email,
            });

            // Generate invitation link
            const link = `${window.location.origin}/accept-invitation?token=${response.data.token}`;
            setInvitationLink(link);
        } catch (error: unknown) {
            console.error('Failed to create invitation:', error);
            showAlert('error', tCommon('createError'));
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

        const message = `Hola! Te invito a unirte a Coach Hub Running como atleta. Usa este enlace para aceptar la invitacion: ${invitationLink}`;
        return `https://wa.me/?text=${encodeURIComponent(message)}`;
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{tAthlete('title')}</DialogTitle>
                    <DialogDescription>
                        {invitationLink
                            ? tAthlete('descriptionCreated')
                            : tAthlete('descriptionCreate')}
                    </DialogDescription>
                </DialogHeader>

                {!invitationLink ? (
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">{tCommon('email')}</Label>
                            <div className="flex gap-2">
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder={tAthlete('emailPlaceholder')}
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
                                <p className="text-sm text-red-500">{errors.email.message as string}</p>
                            )}
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <Button type="button" variant="outline" onClick={handleClose}>
                                {tCommon('cancel')}
                            </Button>
                            <Button type="submit" disabled={creating}>
                                {creating ? tCommon('creating') : tAthlete('create')}
                            </Button>
                        </div>
                    </form>
                ) : (
                    <div className="space-y-4 pt-4">
                        <div className="space-y-2">
                            <Label>{tCommon('linkLabel')}</Label>
                            <div className="flex gap-2">
                                <Input value={invitationLink} readOnly className="font-mono text-xs" />
                                <Button
                                    type="button"
                                    size="icon"
                                    variant="outline"
                                    onClick={copyToClipboard}
                                >
                                    {copied ? (
                                        <Check className="h-4 w-4 text-green-500" />
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
                            <Button asChild className="bg-green-600 hover:bg-green-700 text-white">
                                <a
                                    href={getWhatsAppShareUrl()}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    <MessageCircle className="h-4 w-4 mr-2" />
                                    {tCommon('sendWhatsapp')}
                                </a>
                            </Button>
                            <Button onClick={handleClose}>{tCommon('close')}</Button>
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
