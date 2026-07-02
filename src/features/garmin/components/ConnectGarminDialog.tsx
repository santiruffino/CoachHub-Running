'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, ShieldAlert } from 'lucide-react';

interface ConnectGarminDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (username: string, password: string, consent: boolean) => Promise<boolean>;
    connecting: boolean;
    error: string | null;
}

/**
 * Credential + consent form for the (unofficial) Garmin connection. Makes the
 * trade-offs explicit: unofficial integration, credentials used once, 2FA
 * unsupported.
 */
export function ConnectGarminDialog({ open, onOpenChange, onSubmit, connecting, error }: ConnectGarminDialogProps) {
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
                    <DialogTitle>Conectar Garmin</DialogTitle>
                    <DialogDescription>
                        Enviá tus entrenamientos de Endurix directo al calendario de tu Garmin.
                    </DialogDescription>
                </DialogHeader>

                <Alert className="border-amber-500/30 bg-amber-500/10">
                    <ShieldAlert className="h-4 w-4" />
                    <AlertDescription className="text-xs leading-relaxed">
                        Esta es una integración <strong>no oficial</strong>. Usamos tus credenciales de
                        Garmin una sola vez para iniciar sesión y guardamos de forma cifrada únicamente
                        los tokens de sesión (nunca tu contraseña). Podés desconectarla cuando quieras.
                        La cuenta <strong>no debe tener 2FA activado</strong> (no está soportado).
                    </AlertDescription>
                </Alert>

                <div className="flex flex-col gap-3 py-1">
                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="garmin-email">Email de Garmin</Label>
                        <Input
                            id="garmin-email"
                            type="email"
                            autoComplete="off"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="tu@email.com"
                        />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="garmin-password">Contraseña de Garmin</Label>
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
                        <span>
                            Entiendo que es una integración no oficial y autorizo a Endurix a conectarse a
                            mi cuenta de Garmin para enviar y leer entrenamientos.
                        </span>
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
                        Cancelar
                    </Button>
                    <Button onClick={handleSubmit} disabled={!canSubmit}>
                        {connecting ? 'Conectando…' : 'Conectar'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
