'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, ShieldAlert } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface ConnectGarminDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (username: string, password: string, consent: boolean) => Promise<boolean>;
    connecting: boolean;
    error: string | null;
}

export function ConnectGarminDialog({ open, onOpenChange, onSubmit, connecting, error }: ConnectGarminDialogProps) {
    const t = useTranslations('garmin');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [consent, setConsent] = useState(false);

    const canSubmit = username.trim() && password && consent && !connecting;

    const handleSubmit = async () => {
        if (!canSubmit) return;
        const ok = await onSubmit(username.trim(), password, consent);
        if (ok) {
            setUsername('');
            setPassword('');
            setConsent(false);
            onOpenChange(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>{t('dialogTitle')}</DialogTitle>
                    <DialogDescription>
                        {t('description')}
                    </DialogDescription>
                </DialogHeader>

                <Alert className="border-amber-500/30 bg-amber-500/10">
                    <ShieldAlert className="h-4 w-4" />
                    <AlertDescription className="text-xs leading-relaxed">
                        {t.rich('disclaimer', { strong: (chunks) => <strong>{chunks}</strong> })}
                    </AlertDescription>
                </Alert>

                <div className="flex flex-col gap-3 py-1">
                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="garmin-email">{t('emailLabel')}</Label>
                        <Input
                            id="garmin-email"
                            type="email"
                            autoComplete="off"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder={t('emailPlaceholder')}
                        />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="garmin-password">{t('passwordLabel')}</Label>
                        <Input
                            id="garmin-password"
                            type="password"
                            autoComplete="off"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>
                    <label className="flex items-start gap-2 text-xs text-muted-foreground cursor-pointer mt-1">
                        <input
                            type="checkbox"
                            className="mt-0.5"
                            checked={consent}
                            onChange={(e) => setConsent(e.target.checked)}
                        />
                        <span>{t('consentText')}</span>
                    </label>
                </div>

                {error && (
                    <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription className="text-xs">{error}</AlertDescription>
                    </Alert>
                )}

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={connecting}>
                        {t('cancel')}
                    </Button>
                    <Button onClick={handleSubmit} disabled={!canSubmit}>
                        {connecting ? t('connecting') : t('connect')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
