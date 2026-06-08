'use client';
import { appLogger } from '@/lib/app-logger';


import { useState, useRef } from 'react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import api from '@/lib/axios';
import { Check, Copy, MessageCircle, Upload, AlertCircle, Loader2 } from 'lucide-react';
import { AlertDialog, useAlertDialog } from '@/components/ui/AlertDialog';
import { trackInvitationCreated } from '@/lib/analytics/events';
import { useApiError } from '@/hooks/useApiError';
import { TeamInviteLinkManager } from '@/features/invitations/components/TeamInviteLinkManager';

interface InviteAthleteModalProps {
    open: boolean;
    onClose: () => void;
}

interface InviteFormData {
    email: string;
}

interface BulkSummary {
    total: number;
    success: number;
    failed: number;
    exists: number;
    pending: number;
}

export function InviteAthleteModal({ open, onClose }: InviteAthleteModalProps) {
    const tAthlete = useTranslations('invitations.modals.athlete');
    const tCommon = useTranslations('invitations.modals.common');
    const { register, handleSubmit, reset, formState: { errors } } = useForm<InviteFormData>();
    const { translateError } = useApiError();
    
    const [creating, setCreating] = useState(false);
    const [invitationLink, setInvitationLink] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const { alertState, showAlert, closeAlert } = useAlertDialog();

    // Bulk states
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [bulkFile, setBulkFile] = useState<File | null>(null);
    const [bulkEmails, setBulkEmails] = useState<string[]>([]);
    const [isProcessingBulk, setIsProcessingBulk] = useState(false);
    const [bulkSummary, setBulkSummary] = useState<BulkSummary | null>(null);

    const onSubmitSingle = async (data: InviteFormData) => {
        setCreating(true);
        try {
            const response = await api.post('/v2/invitations', {
                email: data.email,
            });

            trackInvitationCreated({ role: 'ATHLETE' });

            const link = `${window.location.origin}/accept-invitation?token=${response.data.token}`;
            setInvitationLink(link);
        } catch (error: unknown) {
            appLogger.error('Failed to create invitation:', error);
            showAlert('error', translateError(error));
        } finally {
            setCreating(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.name.endsWith('.csv') && !file.name.endsWith('.txt')) {
            showAlert('error', tAthlete('bulk.invalidFile'));
            return;
        }

        setBulkFile(file);
        
        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target?.result as string;
            const emails = content
                .split(/[\n,]/)
                .map(e => e.trim())
                .filter(e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
            
            setBulkEmails(Array.from(new Set(emails)));
        };
        reader.readAsText(file);
    };

    const onSubmitBulk = async () => {
        if (bulkEmails.length === 0) {
            showAlert('error', tAthlete('bulk.noEmails'));
            return;
        }

        setIsProcessingBulk(true);
        try {
            const response = await api.post('/v2/invitations/bulk', {
                emails: bulkEmails,
            });
            setBulkSummary(response.data.summary);
            trackInvitationCreated({ role: 'ATHLETE' }); // Could be tracked per email or once
        } catch (error) {
            appLogger.error('Bulk invitation failed:', error);
            showAlert('error', translateError(error));
        } finally {
            setIsProcessingBulk(false);
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
        setBulkFile(null);
        setBulkEmails([]);
        setBulkSummary(null);
        onClose();
    };

    const getWhatsAppShareUrl = () => {
        if (!invitationLink) return '#';
        const message = `Hola! Te invito a unirte a Endurix como atleta. Usa este enlace para aceptar la invitacion: ${invitationLink}`;
        return `https://wa.me/?text=${encodeURIComponent(message)}`;
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-md bg-endurix-paper dark:bg-card border border-endurix-black/15 dark:border-border">
                <DialogHeader>
                    <DialogTitle className="uppercase tracking-widest text-base" style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}>{tAthlete('title')}</DialogTitle>
                    <DialogDescription>
                        {invitationLink
                            ? tAthlete('descriptionCreated')
                            : tAthlete('descriptionCreate')}
                    </DialogDescription>
                </DialogHeader>

                {!invitationLink && !bulkSummary && (
                    <Tabs defaultValue="single" className="w-full mt-4">
                        <TabsList className="grid w-full grid-cols-3 bg-endurix-black/8 dark:bg-white/8">
                            <TabsTrigger value="single" className="uppercase tracking-widest text-[10px] data-[state=active]:bg-endurix-orange data-[state=active]:text-white" style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}>{tAthlete('tabs.single')}</TabsTrigger>
                            <TabsTrigger value="bulk" className="uppercase tracking-widest text-[10px] data-[state=active]:bg-endurix-orange data-[state=active]:text-white" style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}>{tAthlete('tabs.bulk')}</TabsTrigger>
                            <TabsTrigger value="teamLink" className="uppercase tracking-widest text-[10px] data-[state=active]:bg-endurix-orange data-[state=active]:text-white" style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}>{tAthlete('tabs.teamLink')}</TabsTrigger>
                        </TabsList>

                        <TabsContent value="single" className="pt-4 space-y-4">
                            <form onSubmit={handleSubmit(onSubmitSingle)} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="email" className="text-[10px] uppercase tracking-widest text-endurix-black/50 dark:text-muted-foreground" style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}>{tCommon('email')}</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder={tAthlete('emailPlaceholder')}
                                        variant="boxed"
                                        {...register('email', {
                                            required: tCommon('emailRequired'),
                                            pattern: {
                                                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                                                message: tCommon('emailInvalid'),
                                            },
                                        })}
                                    />
                                    {errors.email && (
                                        <p className="text-sm text-red-500">{errors.email.message as string}</p>
                                    )}
                                </div>
                                <div className="flex justify-end gap-2 pt-2">
                                    <Button type="button" variant="outline-brand" className="uppercase tracking-widest text-[10px]" onClick={handleClose}>
                                        {tCommon('cancel')}
                                    </Button>
                                    <Button type="submit" variant="orange" className="uppercase tracking-widest text-[10px]" disabled={creating}>
                                        {creating ? (
                                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {tCommon('creating')}</>
                                        ) : tAthlete('create')}
                                    </Button>
                                </div>
                            </form>
                        </TabsContent>

                        <TabsContent value="bulk" className="pt-4 space-y-4">
                            <div
                                className="border-2 border-dashed border-endurix-black/20 dark:border-white/20 p-8 text-center cursor-pointer hover:bg-endurix-black/5 dark:hover:bg-white/5 transition-colors"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    accept=".csv,.txt"
                                    onChange={handleFileChange}
                                />
                                <div className="flex flex-col items-center gap-2">
                                    <Upload className="h-8 w-8 text-endurix-orange" />
                                    <p className="text-sm font-medium uppercase tracking-widest" style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}>{bulkFile ? tAthlete('bulk.fileSelected', { name: bulkFile.name }) : tAthlete('bulk.dropzone')}</p>
                                    <p className="text-xs text-muted-foreground">{tAthlete('bulk.description')}</p>
                                </div>
                            </div>

                            {bulkEmails.length > 0 && (
                                <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 p-2">
                                    <Check className="h-4 w-4" />
                                    <span className="font-mono text-xs uppercase tracking-wider">{bulkEmails.length} correos detectados</span>
                                </div>
                            )}

                            <div className="flex justify-end gap-2 pt-2">
                                <Button type="button" variant="outline-brand" className="uppercase tracking-widest text-[10px]" onClick={handleClose}>
                                    {tCommon('cancel')}
                                </Button>
                            <Button
                                variant="orange"
                                className="uppercase tracking-widest text-[10px]"
                                onClick={onSubmitBulk}
                                disabled={isProcessingBulk || bulkEmails.length === 0}
                            >
                                {isProcessingBulk ? (
                                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {tAthlete('bulk.processing', { count: bulkEmails.length })}</>
                                ) : tAthlete('create')}
                            </Button>
                        </div>
                    </TabsContent>

                        <TabsContent value="teamLink" className="pt-4 space-y-4">
                            <TeamInviteLinkManager onClose={handleClose} />
                        </TabsContent>
                    </Tabs>
                )}

                {invitationLink && (
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

                {bulkSummary && (
                    <div className="space-y-6 pt-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 bg-endurix-black/8 dark:bg-white/8 text-center">
                                <p className="text-[10px] text-muted-foreground uppercase tracking-widest" style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}>{tAthlete('bulk.summary.total')}</p>
                                <p className="text-2xl font-bold text-endurix-black dark:text-foreground" style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}>{bulkSummary.total}</p>
                            </div>
                            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-center">
                                <p className="text-[10px] text-emerald-700 dark:text-emerald-400 uppercase tracking-widest" style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}>{tAthlete('bulk.summary.success')}</p>
                                <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400" style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}>{bulkSummary.success}</p>
                            </div>
                            <div className="p-3 bg-blue-500/10 border border-blue-500/30 text-center">
                                <p className="text-[10px] text-blue-700 dark:text-blue-400 uppercase tracking-widest" style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}>{tAthlete('bulk.summary.pending')}</p>
                                <p className="text-2xl font-bold text-blue-700 dark:text-blue-400" style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}>{bulkSummary.pending}</p>
                            </div>
                            <div className="p-3 bg-amber-500/10 border border-amber-500/30 text-center">
                                <p className="text-[10px] text-amber-700 dark:text-amber-400 uppercase tracking-widest" style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}>{tAthlete('bulk.summary.exists')}</p>
                                <p className="text-2xl font-bold text-amber-700 dark:text-amber-400" style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}>{bulkSummary.exists}</p>
                            </div>
                        </div>

                        {bulkSummary.failed > 0 && (
                            <div className="flex items-center gap-2 text-sm text-red-700 dark:text-red-400 bg-red-500/10 border border-red-500/30 p-3">
                                <AlertCircle className="h-4 w-4" />
                                <span className="font-mono text-xs uppercase tracking-wider">{tAthlete('bulk.summary.failed')}: {bulkSummary.failed}</span>
                            </div>
                        )}

                        <div className="flex justify-end pt-2">
                            <Button variant="orange" className="w-full sm:w-auto uppercase tracking-widest text-[10px]" onClick={handleClose}>{tCommon('close')}</Button>
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

