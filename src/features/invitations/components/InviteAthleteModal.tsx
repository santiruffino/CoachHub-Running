'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
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
import { Check, Copy, Mail } from 'lucide-react';

interface InviteAthleteModalProps {
    open: boolean;
    onClose: () => void;
}

export function InviteAthleteModal({ open, onClose }: InviteAthleteModalProps) {
    const { register, handleSubmit, reset, formState: { errors } } = useForm();
    const [creating, setCreating] = useState(false);
    const [invitationLink, setInvitationLink] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const onSubmit = async (data: any) => {
        setCreating(true);
        try {
            const response = await api.post('/invitations', {
                email: data.email,
            });

            // Generate invitation link
            const link = `${window.location.origin}/accept-invitation?token=${response.data.token}`;
            setInvitationLink(link);
        } catch (error: any) {
            console.error('Failed to create invitation:', error);
            alert('Failed to create invitation. Please try again.');
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

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Invitar Atleta</DialogTitle>
                    <DialogDescription>
                        {invitationLink
                            ? 'Invitación creada! Comparte el enlace con el atleta.'
                            : 'Ingresa el email del atleta para enviar una invitación.'}
                    </DialogDescription>
                </DialogHeader>

                {!invitationLink ? (
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <div className="flex gap-2">
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="atleta@ejemplo.com"
                                    {...register('email', {
                                        required: 'Email es requerido',
                                        pattern: {
                                            value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                                            message: 'Email inválido',
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
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={creating}>
                                {creating ? 'Creando...' : 'Crear Invitación'}
                            </Button>
                        </div>
                    </form>
                ) : (
                    <div className="space-y-4 pt-4">
                        <div className="space-y-2">
                            <Label>Enlace de Invitación</Label>
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
                                Este enlace expira en 7 días.
                            </p>
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <Button onClick={handleClose}>Cerrar</Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
