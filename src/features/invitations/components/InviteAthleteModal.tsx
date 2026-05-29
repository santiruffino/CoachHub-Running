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
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{tAthlete('title')}</DialogTitle>
                    <DialogDescription>
                        {invitationLink
                            ? tAthlete('descriptionCreated')
                            : tAthlete('descriptionCreate')}
                    </DialogDescription>
                </DialogHeader>

                {!invitationLink && !bulkSummary && (
                    <Tabs defaultValue="single" className="w-full mt-4">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="single">{tAthlete('tabs.single')}</TabsTrigger>
                            <TabsTrigger value="bulk">{tAthlete('tabs.bulk')}</TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="single" className="pt-4 space-y-4">
                            <form onSubmit={handleSubmit(onSubmitSingle)} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="email">{tCommon('email')}</Label>
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
                                    {errors.email && (
                                        <p className="text-sm text-red-500">{errors.email.message as string}</p>
                                    )}
                                </div>
                                <div className="flex justify-end gap-2 pt-2">
                                    <Button type="button" variant="outline" onClick={handleClose}>
                                        {tCommon('cancel')}
                                    </Button>
                                    <Button type="submit" disabled={creating}>
                                        {creating ? (
                                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {tCommon('creating')}</>
                                        ) : tAthlete('create')}
                                    </Button>
                                </div>
                            </form>
                        </TabsContent>

                        <TabsContent value="bulk" className="pt-4 space-y-4">
                            <div 
                                className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-muted/50 transition-colors"
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
                                    <Upload className="h-8 w-8 text-muted-foreground" />
                                    <p className="text-sm font-medium">{bulkFile ? tAthlete('bulk.fileSelected', { name: bulkFile.name }) : tAthlete('bulk.dropzone')}</p>
                                    <p className="text-xs text-muted-foreground">{tAthlete('bulk.description')}</p>
                                </div>
                            </div>

                            {bulkEmails.length > 0 && (
                                <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 dark:bg-green-950/20 p-2 rounded">
                                    <Check className="h-4 w-4" />
                                    <span>{bulkEmails.length} correos detectados</span>
                                </div>
                            )}

                            <div className="flex justify-end gap-2 pt-2">
                                <Button type="button" variant="outline" onClick={handleClose}>
                                    {tCommon('cancel')}
                                </Button>
                                <Button 
                                    onClick={onSubmitBulk} 
                                    disabled={isProcessingBulk || bulkEmails.length === 0}
                                >
                                    {isProcessingBulk ? (
                                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {tAthlete('bulk.processing', { count: bulkEmails.length })}</>
                                    ) : tAthlete('create')}
                                </Button>
                            </div>
                        </TabsContent>
                    </Tabs>
                )}

                {invitationLink && (
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

                {bulkSummary && (
                    <div className="space-y-6 pt-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-3 bg-muted rounded-lg text-center">
                                <p className="text-xs text-muted-foreground uppercase font-bold">{tAthlete('bulk.summary.total')}</p>
                                <p className="text-2xl font-bold">{bulkSummary.total}</p>
                            </div>
                            <div className="p-3 bg-green-100 dark:bg-green-950/30 rounded-lg text-center">
                                <p className="text-xs text-green-600 dark:text-green-400 uppercase font-bold">{tAthlete('bulk.summary.success')}</p>
                                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{bulkSummary.success}</p>
                            </div>
                            <div className="p-3 bg-blue-100 dark:bg-blue-950/30 rounded-lg text-center">
                                <p className="text-xs text-blue-600 dark:text-blue-400 uppercase font-bold">{tAthlete('bulk.summary.pending')}</p>
                                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{bulkSummary.pending}</p>
                            </div>
                            <div className="p-3 bg-amber-100 dark:bg-amber-950/30 rounded-lg text-center">
                                <p className="text-xs text-amber-600 dark:text-amber-400 uppercase font-bold">{tAthlete('bulk.summary.exists')}</p>
                                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{bulkSummary.exists}</p>
                            </div>
                        </div>

                        {bulkSummary.failed > 0 && (
                            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-950/20 p-3 rounded-lg">
                                <AlertCircle className="h-4 w-4" />
                                <span>{tAthlete('bulk.summary.failed')}: {bulkSummary.failed}</span>
                            </div>
                        )}

                        <div className="flex justify-end pt-2">
                            <Button onClick={handleClose} className="w-full sm:w-auto">{tCommon('close')}</Button>
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

