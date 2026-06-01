'use client';
import { appLogger } from '@/lib/app-logger';


import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MonospaceLabel } from '@/components/dashboard';
import { useTranslations } from 'next-intl';

interface CoachNotesProps {
  athleteId: string;
  initialNotes?: string;
  onSave?: (notes: string) => Promise<void>;
  readOnly?: boolean;
}

export function CoachNotes({ athleteId, initialNotes = '', onSave, readOnly = false }: CoachNotesProps) {
  void athleteId;
  const t = useTranslations('dashboard.coachNotes');
  const [notes, setNotes] = useState(initialNotes);
  const [isSaving, setIsSaving] = useState(false);
  const [lastEdited, setLastEdited] = useState<string>('');

  const handleSave = async () => {
    if (!onSave) return;

    setIsSaving(true);
    try {
      await onSave(notes);
      const now = new Date();

      const dateStr = now.toLocaleDateString('es-ES', {
        month: 'short',
        day: 'numeric',
      });
      const timeStr = now.toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
      setLastEdited(t('lastEdited', { date: dateStr, time: timeStr }));
    } catch (error) {
      appLogger.error('Failed to save notes:', error);
    } finally {
      setIsSaving(false);
    }
  };

  if (readOnly) {
    return (
      <div>
        <p className="text-sm text-endurix-black/70 dark:text-muted-foreground whitespace-pre-wrap leading-relaxed">
          {notes || (
            <span className="text-endurix-black/40 dark:text-muted-foreground/60 italic">
              {t('placeholder')}
            </span>
          )}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder={t('placeholder')}
        className="min-h-32 resize-none text-sm"
      />
      {lastEdited && (
        <MonospaceLabel color="muted" size="xs">
          {lastEdited}
        </MonospaceLabel>
      )}
      <Button
        variant="orange"
        onClick={handleSave}
        disabled={isSaving}
        className="w-full uppercase tracking-widest"
      >
        {isSaving ? t('saving') : t('save')}
      </Button>
    </div>
  );
}
