'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { FileText } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface CoachNotesProps {
  athleteId: string;
  initialNotes?: string;
  onSave?: (notes: string) => Promise<void>;
}

export function CoachNotes({ athleteId, initialNotes = '', onSave }: CoachNotesProps) {
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
        day: 'numeric' 
      });
      const timeStr = now.toLocaleTimeString('es-ES', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      });
      setLastEdited(t('lastEdited', { date: dateStr, time: timeStr }));
    } catch (error) {
      console.error('Failed to save notes:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FileText className="h-4 w-4" />
          {t('title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={t('placeholder')}
          className="min-h-32 resize-none text-sm"
        />
        {lastEdited && (
          <p className="text-xs text-muted-foreground">{lastEdited}</p>
        )}
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full"
        >
          {isSaving ? t('saving') : t('save')}
        </Button>
      </CardContent>
    </Card>
  );
}
