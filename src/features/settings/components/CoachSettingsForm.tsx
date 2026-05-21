'use client';
import { appLogger } from '@/lib/app-logger';

import { useState } from 'react';
import { settingsService } from '@/features/settings/services/settings.service';
import { CoachSettings } from '@/features/settings/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, ShieldAlert, Cpu } from 'lucide-react';

interface CoachSettingsFormProps {
    initialSettings: CoachSettings;
}

export function CoachSettingsForm({ initialSettings }: CoachSettingsFormProps) {
  const [settings, setSettings] = useState<CoachSettings>(initialSettings);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    try {
      setSaving(true);
      await settingsService.updateCoachSettings(settings);
    } catch (error) {
      appLogger.error('coach_settings.save_failed', { error });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <div>
        <h1 className="text-3xl font-bold font-display tracking-tight text-foreground">Ajustes de Entrenador</h1>
        <p className="text-muted-foreground mt-1">Configura tus propios umbrales y modelos preferidos para el seguimiento.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card className="rounded-[2rem] overflow-hidden border-none shadow-xl shadow-primary/5 h-full">
          <CardHeader className="bg-muted/30 pt-8 px-8 pb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/10 rounded-xl">
                <ShieldAlert className="h-5 w-5 text-amber-600" />
              </div>
              <CardTitle className="text-xl">Umbrales de Alerta</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-8 space-y-6">
            <div className="space-y-2">
              <Label htmlFor="rpeMismatchThreshold" className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Desviación RPE</Label>
              <Input
                id="rpeMismatchThreshold"
                type="number"
                min={1}
                max={10}
                value={settings.thresholds.rpeMismatchThreshold}
                onChange={(e) =>
                  setSettings((current) => ({
                    ...current,
                    thresholds: {
                      ...current.thresholds,
                      rpeMismatchThreshold: Number(e.target.value),
                    },
                  }))
                }
                className="rounded-xl h-12 bg-muted/20 border-muted"
                disabled={saving}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lowComplianceThreshold" className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Cumplimiento Mínimo (%)</Label>
              <Input
                id="lowComplianceThreshold"
                type="number"
                min={1}
                max={100}
                value={settings.thresholds.lowComplianceThreshold}
                onChange={(e) =>
                  setSettings((current) => ({
                    ...current,
                    thresholds: {
                      ...current.thresholds,
                      lowComplianceThreshold: Number(e.target.value),
                    },
                  }))
                }
                className="rounded-xl h-12 bg-muted/20 border-muted"
                disabled={saving}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[2rem] overflow-hidden border-none shadow-xl shadow-primary/5 h-full">
          <CardHeader className="bg-muted/30 pt-8 px-8 pb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-xl">
                <Cpu className="h-5 w-5 text-blue-600" />
              </div>
              <CardTitle className="text-xl">Modelos de IA</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-8 space-y-6">
            <div className="space-y-2">
              <Label htmlFor="workoutMatcherModel" className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Motor de Emparejamiento</Label>
              <Input
                id="workoutMatcherModel"
                value={settings.defaultModels.workoutMatcherModel}
                onChange={(e) =>
                  setSettings((current) => ({
                    ...current,
                    defaultModels: {
                      ...current.defaultModels,
                      workoutMatcherModel: e.target.value,
                    },
                  }))
                }
                className="rounded-xl h-12 bg-muted/20 border-muted"
                disabled={saving}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="complianceModel" className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Motor de Cumplimiento</Label>
              <Input
                id="complianceModel"
                value={settings.defaultModels.complianceModel}
                onChange={(e) =>
                  setSettings((current) => ({
                    ...current,
                    defaultModels: {
                      ...current.defaultModels,
                      complianceModel: e.target.value,
                    },
                  }))
                }
                className="rounded-xl h-12 bg-muted/20 border-muted"
                disabled={saving}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end pt-4">
        <Button
          disabled={saving}
          onClick={handleSave}
          className="h-14 px-10 rounded-2xl font-bold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all text-base"
        >
          {saving ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Guardando...</> : 'Guardar Preferencias'}
        </Button>
      </div>
    </div>
  );
}
