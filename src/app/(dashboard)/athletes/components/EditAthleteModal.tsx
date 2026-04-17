'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import api from '@/lib/axios';
import { useTranslations } from 'next-intl';

interface AthleteData {
  id: string;
  name: string;
  email: string;
  sport: string;
  level: string;
  coach?: {
    id: string;
    name: string;
  } | null;
  groups: { id: string; name: string }[];
}

interface EditAthleteModalProps {
  athlete: AthleteData | null;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  isAdmin: boolean;
  coaches: { id: string; name: string }[];
}

export function EditAthleteModal({ athlete, open, onClose, onSuccess, isAdmin, coaches }: EditAthleteModalProps) {
  const [name, setName] = useState('');
  const [coachId, setCoachId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Translation fallback, assuming 'athletes' namespace might not have 'edit' keys yet
  const t = useTranslations('athletes');

  useEffect(() => {
    if (athlete && open) {
      setName(athlete.name || '');
      setCoachId(athlete.coach?.id || '');
      setError('');
    }
  }, [athlete, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!athlete) return;
    
    try {
      setLoading(true);
      setError('');
      
      const payload: any = { name };
      if (isAdmin && coachId !== athlete.coach?.id) {
        payload.coach_id = coachId;
      }
      
      await api.patch(`/v2/users/${athlete.id}`, payload);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update athlete');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Editar Atleta</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          {error && (
            <div className="bg-red-50 text-red-500 p-3 rounded-md text-sm border border-red-100">
              {error}
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="name">Nombre</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nombre completo"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email (No modificable)</Label>
            <Input
              id="email"
              value={athlete?.email || ''}
              disabled
              className="bg-muted"
            />
          </div>

          {isAdmin && (
            <div className="space-y-2">
              <Label htmlFor="coach">Entrenador Asignado</Label>
              <Select value={coachId} onValueChange={setCoachId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un coach" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin Entrenador</SelectItem>
                  {coaches.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name || c.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
