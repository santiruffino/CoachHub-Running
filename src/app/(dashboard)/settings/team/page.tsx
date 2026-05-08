'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { settingsService } from '@/features/settings/services/settings.service';
import { TeamSettings } from '@/features/settings/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { appLogger } from '@/lib/app-logger';

const EMPTY_SETTINGS: TeamSettings = {
  thresholds: {
    rpeMismatchThreshold: 2,
    lowComplianceThreshold: 50,
  },
  branding: {
    teamName: 'Coach Hub Team',
    logoUrl: '',
    primaryColor: '#1f2937',
  },
  defaultModels: {
    workoutMatcherModel: 'baseline-v1',
    complianceModel: 'baseline-v1',
  },
};

export default function TeamSettingsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [settings, setSettings] = useState<TeamSettings>(EMPTY_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && user?.role !== 'ADMIN') {
      router.push('/dashboard');
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await settingsService.getTeamSettings();
        setSettings(response.data);
      } catch (error) {
        appLogger.error('team_settings.load_failed', { error });
      } finally {
        setLoading(false);
      }
    };

    if (user?.role === 'ADMIN') {
      void load();
    }
  }, [user?.role]);

  const canRender = useMemo(() => !authLoading && user?.role === 'ADMIN', [authLoading, user?.role]);

  if (!canRender) return null;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-display tracking-tight">Team Settings</h1>
        <p className="text-muted-foreground mt-1">Team-wide thresholds, branding, and default models.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Branding</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-3">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="teamName">Team name</Label>
            <Input
              id="teamName"
              value={settings.branding.teamName}
              onChange={(e) =>
                setSettings((current) => ({
                  ...current,
                  branding: { ...current.branding, teamName: e.target.value },
                }))
              }
              disabled={loading || saving}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="primaryColor">Primary color</Label>
            <Input
              id="primaryColor"
              value={settings.branding.primaryColor}
              onChange={(e) =>
                setSettings((current) => ({
                  ...current,
                  branding: { ...current.branding, primaryColor: e.target.value },
                }))
              }
              disabled={loading || saving}
            />
          </div>

          <div className="space-y-2 sm:col-span-3">
            <Label htmlFor="logoUrl">Logo URL</Label>
            <Input
              id="logoUrl"
              value={settings.branding.logoUrl}
              onChange={(e) =>
                setSettings((current) => ({
                  ...current,
                  branding: { ...current.branding, logoUrl: e.target.value },
                }))
              }
              disabled={loading || saving}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Thresholds</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="rpeMismatchThreshold">RPE mismatch threshold</Label>
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
              disabled={loading || saving}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="lowComplianceThreshold">Low compliance threshold (%)</Label>
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
              disabled={loading || saving}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Default Models</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="workoutMatcherModel">Workout matcher model</Label>
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
              disabled={loading || saving}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="complianceModel">Compliance model</Label>
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
              disabled={loading || saving}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          disabled={loading || saving}
          onClick={async () => {
            try {
              setSaving(true);
              await settingsService.updateTeamSettings(settings);
            } catch (error) {
              appLogger.error('team_settings.save_failed', { error });
            } finally {
              setSaving(false);
            }
          }}
        >
          {saving ? 'Saving...' : 'Save Team Settings'}
        </Button>
      </div>
    </div>
  );
}
