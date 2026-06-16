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
import { SectionHeader, DashboardCardHeaderDots } from '@/components/dashboard';
import { BackButton } from '@/components/ui/BackButton';

interface CoachSettingsFormProps {
    initialSettings: CoachSettings;
}

const FIELD_LABEL = 'text-[10px] uppercase tracking-widest text-endurix-black/50 dark:text-muted-foreground';
const PAPER_BG = 'bg-endurix-paper dark:bg-card';

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
      <div className="mb-4">
        <BackButton href="/settings" />
      </div>
      <SectionHeader
        eyebrow="Ajustes"
        title="Entrenador"
        description="Configura tus propios umbrales y modelos preferidos para el seguimiento."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className={`${PAPER_BG} border border-endurix-black/10 dark:border-border`}>
          <CardHeader className="border-b border-endurix-black/10 dark:border-border flex flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-endurix-black/8 dark:bg-white/8">
                <ShieldAlert className="h-4 w-4 text-endurix-orange" />
              </div>
              <CardTitle className="text-base uppercase tracking-widest" style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}>Umbrales de Alerta</CardTitle>
            </div>
            <DashboardCardHeaderDots />
          </CardHeader>
          <CardContent className="p-6 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="rpeMismatchThreshold" className={FIELD_LABEL} style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}>Desviación RPE</Label>
              <Input
                id="rpeMismatchThreshold"
                variant="boxed"
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
                disabled={saving}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lowComplianceThreshold" className={FIELD_LABEL} style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}>Cumplimiento Mínimo (%)</Label>
              <Input
                id="lowComplianceThreshold"
                variant="boxed"
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
                disabled={saving}
              />
            </div>
          </CardContent>
        </Card>

        <Card className={`${PAPER_BG} border border-endurix-black/10 dark:border-border`}>
          <CardHeader className="border-b border-endurix-black/10 dark:border-border flex flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-endurix-black/8 dark:bg-white/8">
                <Cpu className="h-4 w-4 text-endurix-orange" />
              </div>
              <CardTitle className="text-base uppercase tracking-widest" style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}>Modelos de IA</CardTitle>
            </div>
            <DashboardCardHeaderDots />
          </CardHeader>
          <CardContent className="p-6 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="workoutMatcherModel" className={FIELD_LABEL} style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}>Motor de Emparejamiento</Label>
              <Input
                id="workoutMatcherModel"
                variant="boxed"
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
                disabled={saving}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="complianceModel" className={FIELD_LABEL} style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}>Motor de Cumplimiento</Label>
              <Input
                id="complianceModel"
                variant="boxed"
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
                disabled={saving}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end pt-4">
        <Button
          variant="orange"
          disabled={saving}
          onClick={handleSave}
          className="px-8 uppercase tracking-widest text-xs"
          size="lg"
        >
          {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando...</> : 'Guardar Preferencias'}
        </Button>
      </div>
    </div>
  );
}
