'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { FileText } from 'lucide-react';

interface CoachNotesProps {
  athleteId: string;
  initialNotes?: string;
  onSave?: (notes: string) => Promise<void>;
}

export function CoachNotes({ athleteId, initialNotes = '', onSave }: CoachNotesProps) {
  const [notes, setNotes] = useState(initialNotes);
  const [isSaving, setIsSaving] = useState(false);
  const [lastEdited, setLastEdited] = useState<string>('');

  const handleSave = async () => {
    if (!onSave) return;
    
    setIsSaving(true);
    try {
      await onSave(notes);
      const now = new Date();
      setLastEdited(`Última edición: ${now.toLocaleDateString('es-ES', { 
        month: 'short', 
        day: 'numeric' 
      })} ${now.toLocaleTimeString('es-ES', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      })}`);
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
          Notas del Entrenador
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Añade observaciones sobre la progresión de Carlos..."
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
          {isSaving ? 'Guardando...' : 'Guardar Nota'}
        </Button>
      </CardContent>
    </Card>
  );
}
