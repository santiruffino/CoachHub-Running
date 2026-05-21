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

interface TeamSettingsFormProps {
    initialSettings: TeamSettings;
}

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
      <div>
        <h1 className="text-3xl font-bold font-display tracking-tight text-foreground">Configuración del Equipo</h1>
        <p className="text-muted-foreground mt-1">Personaliza el nombre, colores y modelos para toda tu organización.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <Card className="rounded-[2rem] overflow-hidden border-none shadow-xl shadow-primary/5">
            <CardHeader className="bg-muted/30 pt-8 px-8 pb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-xl">
                  <Palette className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-xl">Marca & Branding</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-8 grid gap-6 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-1">
                <Label htmlFor="teamName" className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Nombre del equipo</Label>
                <Input
                  id="teamName"
                  value={settings.branding.teamName}
                  onChange={(e) =>
                    setSettings((current) => ({
                      ...current,
                      branding: { ...current.branding, teamName: e.target.value },
                    }))
                  }
                  className="rounded-xl h-12 bg-muted/20 border-muted"
                  disabled={saving}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="primaryColor" className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Color primario (Hex)</Label>
                <div className="flex gap-3">
                    <Input
                        id="primaryColor"
                        value={settings.branding.primaryColor}
                        onChange={(e) =>
                            setSettings((current) => ({
                            ...current,
                            branding: { ...current.branding, primaryColor: e.target.value },
                            }))
                        }
                        className="rounded-xl h-12 bg-muted/20 border-muted font-mono"
                        disabled={saving}
                    />
                    <div 
                        className="w-12 h-12 rounded-xl border border-muted shrink-0 shadow-inner" 
                        style={{ backgroundColor: settings.branding.primaryColor }}
                    />
                </div>
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="logoUrl" className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">URL del Logo</Label>
                <Input
                  id="logoUrl"
                  value={settings.branding.logoUrl}
                  onChange={(e) =>
                    setSettings((current) => ({
                      ...current,
                      branding: { ...current.branding, logoUrl: e.target.value },
                    }))
                  }
                  className="rounded-xl h-12 bg-muted/20 border-muted"
                  disabled={saving}
                  placeholder="https://ejemplo.com/logo.png"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[2rem] overflow-hidden border-none shadow-xl shadow-primary/5">
            <CardHeader className="bg-muted/30 pt-8 px-8 pb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/10 rounded-xl">
                  <ShieldAlert className="h-5 w-5 text-amber-600" />
                </div>
                <CardTitle className="text-xl">Umbrales de Alerta</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-8 grid gap-6 sm:grid-cols-2">
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
                <p className="text-[10px] text-muted-foreground px-1 italic">Alertar si la diferencia entre RPE planificado y real es mayor a este valor.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="lowComplianceThreshold" className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Cumplimiento Bajo (%)</Label>
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
                <p className="text-[10px] text-muted-foreground px-1 italic">Alertar si el cumplimiento total cae por debajo de este porcentaje.</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-8">
            <Card className="rounded-[2rem] overflow-hidden border-none shadow-xl shadow-primary/5">
                <CardHeader className="bg-muted/30 pt-8 px-8 pb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/10 rounded-xl">
                        <Cpu className="h-5 w-5 text-blue-600" />
                    </div>
                    <CardTitle className="text-xl">Algoritmos</CardTitle>
                </div>
                </CardHeader>
                <CardContent className="p-8 space-y-6">
                <div className="space-y-2">
                    <Label htmlFor="workoutMatcherModel" className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Motor de Matching</Label>
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

            <div className="flex justify-end pt-4">
                <Button
                    disabled={saving}
                    onClick={handleSave}
                    className="w-full sm:w-auto h-14 px-8 rounded-2xl font-bold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all text-base"
                >
                    {saving ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Guardando...</> : 'Guardar Cambios'}
                </Button>
            </div>
        </div>
      </div>
    </div>
  );
}
