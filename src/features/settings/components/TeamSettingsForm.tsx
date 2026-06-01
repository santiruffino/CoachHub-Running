'use client';
import { appLogger } from '@/lib/app-logger';

import { useState } from 'react';
import { settingsService } from '@/features/settings/services/settings.service';
import { TeamSettings } from '@/features/settings/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Palette, ShieldAlert, Cpu } from 'lucide-react';
import { SectionHeader, DashboardCardHeaderDots } from '@/components/dashboard';

interface TeamSettingsFormProps {
    initialSettings: TeamSettings;
}

const FIELD_LABEL = 'text-[10px] uppercase tracking-widest text-endurix-black/50 dark:text-muted-foreground';
const PAPER_BG = 'bg-endurix-paper dark:bg-card';

export function TeamSettingsForm({ initialSettings }: TeamSettingsFormProps) {
  const [settings, setSettings] = useState<TeamSettings>(initialSettings);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    try {
      setSaving(true);
      await settingsService.updateTeamSettings(settings);
    } catch (error) {
      appLogger.error('team_settings.save_failed', { error });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
      <SectionHeader
        eyebrow="Ajustes"
        title="Configuración del Equipo"
        description="Personaliza el nombre, colores y modelos para toda tu organización."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className={`${PAPER_BG} border border-endurix-black/10 dark:border-border`}>
            <CardHeader className="border-b border-endurix-black/10 dark:border-border flex flex-row items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-endurix-black/8 dark:bg-white/8">
                  <Palette className="h-4 w-4 text-endurix-orange" />
                </div>
                <CardTitle className="text-base uppercase tracking-widest" style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}>Marca &amp; Branding</CardTitle>
              </div>
              <DashboardCardHeaderDots />
            </CardHeader>
            <CardContent className="p-6 grid gap-5 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-1">
                <Label htmlFor="teamName" className={FIELD_LABEL} style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}>Nombre del equipo</Label>
                <Input
                  id="teamName"
                  variant="boxed"
                  value={settings.branding.teamName}
                  onChange={(e) =>
                    setSettings((current) => ({
                      ...current,
                      branding: { ...current.branding, teamName: e.target.value },
                    }))
                  }
                  disabled={saving}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="primaryColor" className={FIELD_LABEL} style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}>Color primario (Hex)</Label>
                <div className="flex gap-3">
                    <Input
                        id="primaryColor"
                        variant="boxed"
                        value={settings.branding.primaryColor}
                        onChange={(e) =>
                            setSettings((current) => ({
                            ...current,
                            branding: { ...current.branding, primaryColor: e.target.value },
                            }))
                        }
                        className="font-mono"
                        disabled={saving}
                    />
                    <div
                        className="w-12 h-12 border border-endurix-black/15 dark:border-border shrink-0"
                        style={{ backgroundColor: settings.branding.primaryColor }}
                    />
                </div>
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="logoUrl" className={FIELD_LABEL} style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}>URL del Logo</Label>
                <Input
                  id="logoUrl"
                  variant="boxed"
                  value={settings.branding.logoUrl}
                  onChange={(e) =>
                    setSettings((current) => ({
                      ...current,
                      branding: { ...current.branding, logoUrl: e.target.value },
                    }))
                  }
                  disabled={saving}
                  placeholder="https://ejemplo.com/logo.png"
                />
              </div>
            </CardContent>
          </Card>

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
            <CardContent className="p-6 grid gap-5 sm:grid-cols-2">
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
                <p className="text-[10px] text-muted-foreground px-1 italic">Alertar si la diferencia entre RPE planificado y real es mayor a este valor.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="lowComplianceThreshold" className={FIELD_LABEL} style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}>Cumplimiento Bajo (%)</Label>
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
                <p className="text-[10px] text-muted-foreground px-1 italic">Alertar si el cumplimiento total cae por debajo de este porcentaje.</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
            <Card className={`${PAPER_BG} border border-endurix-black/10 dark:border-border`}>
                <CardHeader className="border-b border-endurix-black/10 dark:border-border flex flex-row items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-endurix-black/8 dark:bg-white/8">
                        <Cpu className="h-4 w-4 text-endurix-orange" />
                    </div>
                    <CardTitle className="text-base uppercase tracking-widest" style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}>Algoritmos</CardTitle>
                </div>
                <DashboardCardHeaderDots />
                </CardHeader>
                <CardContent className="p-6 space-y-5">
                <div className="space-y-2">
                    <Label htmlFor="workoutMatcherModel" className={FIELD_LABEL} style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}>Motor de Matching</Label>
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

            <div className="flex justify-end pt-4">
                <Button
                    variant="orange"
                    disabled={saving}
                    onClick={handleSave}
                    className="w-full sm:w-auto px-8 uppercase tracking-widest text-xs"
                    size="lg"
                >
                    {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando...</> : 'Guardar Cambios'}
                </Button>
            </div>
        </div>
      </div>
    </div>
  );
}
