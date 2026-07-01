'use client';
import { appLogger } from '@/lib/app-logger';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { settingsService } from '@/features/settings/services/settings.service';
import { CoachSettings } from '@/features/settings/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Info, Loader2, ShieldAlert, Link2, LayoutDashboard, CalendarDays, RefreshCw } from 'lucide-react';
import { SectionHeader, DashboardCardHeaderDots } from '@/components/dashboard';
import { BackButton } from '@/components/ui/BackButton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DashboardPriorityItem } from '@/features/settings/types';

interface CoachSettingsFormProps {
    initialSettings: CoachSettings;
}

const FIELD_LABEL = 'text-[10px] uppercase tracking-widest text-endurix-black/50 dark:text-muted-foreground';
const PAPER_BG = 'bg-endurix-paper dark:bg-card';

function LoadRiskFieldLabel({ htmlFor, label, explanation }: { htmlFor: string; label: string; explanation: string }) {
    const t = useTranslations('settings.coach');

    return (
        <div className="flex items-center gap-1.5">
            <Label htmlFor={htmlFor} className={FIELD_LABEL} style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}>
                {label}
            </Label>
            <Tooltip>
                <TooltipTrigger asChild>
                    <button
                        type="button"
                        className="text-endurix-black/40 dark:text-muted-foreground hover:text-endurix-orange transition-colors"
                        aria-label={t('loadRisk.whatDoesMean', { label })}
                    >
                        <Info className="h-3 w-3" />
                    </button>
                </TooltipTrigger>
                <TooltipContent>{explanation}</TooltipContent>
            </Tooltip>
        </div>
    );
}

export function CoachSettingsForm({ initialSettings }: CoachSettingsFormProps) {
    const t = useTranslations('settings.coach');
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
        <TooltipProvider delayDuration={150}>
            <div className="max-w-4xl mx-auto space-y-8 pb-20">
                <div className="mb-4">
                    <BackButton href="/settings" />
                </div>
                <SectionHeader
                    eyebrow={t('eyebrow')}
                    title={t('title')}
                    description={t('description')}
                />

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className={`${PAPER_BG} border border-endurix-black/10 dark:border-border`}>
                        <CardHeader className="border-b border-endurix-black/10 dark:border-border flex flex-row items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-endurix-black/8 dark:bg-white/8">
                                    <ShieldAlert className="h-4 w-4 text-endurix-orange" />
                                </div>
                                <CardTitle className="text-base uppercase tracking-widest" style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}>
                                    {t('alertsCard.title')}
                                </CardTitle>
                            </div>
                            <DashboardCardHeaderDots />
                        </CardHeader>
                        <CardContent className="p-6 space-y-5">
                            <div className="space-y-2">
                                <Label htmlFor="rpeMismatchThreshold" className={FIELD_LABEL} style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}>
                                    {t('alertsCard.rpeMismatch.label')}
                                </Label>
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
                                <p className="text-[10px] text-muted-foreground px-1 italic">{t('alertsCard.rpeMismatch.help')}</p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="lowComplianceThreshold" className={FIELD_LABEL} style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}>
                                    {t('alertsCard.lowCompliance.label')}
                                </Label>
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
                                <p className="text-[10px] text-muted-foreground px-1 italic">{t('alertsCard.lowCompliance.help')}</p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="matchingThresholdPercentage" className={FIELD_LABEL} style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}>
                                    {t('alertsCard.matchingThreshold.label')}
                                </Label>
                                <Input
                                    id="matchingThresholdPercentage"
                                    variant="boxed"
                                    type="number"
                                    min={1}
                                    max={50}
                                    value={settings.thresholds.matchingThresholdPercentage}
                                    onChange={(e) =>
                                        setSettings((current) => ({
                                            ...current,
                                            thresholds: {
                                                ...current.thresholds,
                                                matchingThresholdPercentage: Number(e.target.value),
                                            },
                                        }))
                                    }
                                    disabled={saving}
                                />
                                <p className="text-[10px] text-muted-foreground px-1 italic">{t('alertsCard.matchingThreshold.help')}</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className={`${PAPER_BG} border border-endurix-black/10 dark:border-border`}>
                        <CardHeader className="border-b border-endurix-black/10 dark:border-border flex flex-row items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-endurix-black/8 dark:bg-white/8">
                                    <ShieldAlert className="h-4 w-4 text-endurix-orange" />
                                </div>
                                <CardTitle className="text-base uppercase tracking-widest" style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}>
                                    {t('loadRiskCard.title')}
                                </CardTitle>
                            </div>
                            <DashboardCardHeaderDots />
                        </CardHeader>
                        <CardContent className="p-6 grid gap-5 sm:grid-cols-2">
                            <p className="sm:col-span-2 text-[11px] text-muted-foreground italic -mt-1">
                                {t('loadRiskCard.intro')} <Info className="inline h-3 w-3 align-text-bottom" />
                            </p>
                            <div className="space-y-2">
                                <LoadRiskFieldLabel
                                    htmlFor="loadRiskHighAcwr"
                                    label={t('loadRisk.highAcwr.label')}
                                    explanation={t('loadRisk.highAcwr.explanation')}
                                />
                                <Input
                                    id="loadRiskHighAcwr"
                                    variant="boxed"
                                    type="number"
                                    step="0.1"
                                    value={settings.thresholds.loadRiskHighAcwr}
                                    onChange={(e) => setSettings((current) => ({ ...current, thresholds: { ...current.thresholds, loadRiskHighAcwr: Number(e.target.value) } }))}
                                    disabled={saving}
                                />
                            </div>
                            <div className="space-y-2">
                                <LoadRiskFieldLabel
                                    htmlFor="loadRiskModerateAcwr"
                                    label={t('loadRisk.moderateAcwr.label')}
                                    explanation={t('loadRisk.moderateAcwr.explanation')}
                                />
                                <Input
                                    id="loadRiskModerateAcwr"
                                    variant="boxed"
                                    type="number"
                                    step="0.1"
                                    value={settings.thresholds.loadRiskModerateAcwr}
                                    onChange={(e) => setSettings((current) => ({ ...current, thresholds: { ...current.thresholds, loadRiskModerateAcwr: Number(e.target.value) } }))}
                                    disabled={saving}
                                />
                            </div>
                            <div className="space-y-2">
                                <LoadRiskFieldLabel
                                    htmlFor="loadRiskLowStimulusAcwr"
                                    label={t('loadRisk.lowStimulusAcwr.label')}
                                    explanation={t('loadRisk.lowStimulusAcwr.explanation')}
                                />
                                <Input
                                    id="loadRiskLowStimulusAcwr"
                                    variant="boxed"
                                    type="number"
                                    step="0.1"
                                    value={settings.thresholds.loadRiskLowStimulusAcwr}
                                    onChange={(e) => setSettings((current) => ({ ...current, thresholds: { ...current.thresholds, loadRiskLowStimulusAcwr: Number(e.target.value) } }))}
                                    disabled={saving}
                                />
                            </div>
                            <div className="space-y-2">
                                <LoadRiskFieldLabel
                                    htmlFor="loadRiskHighTsb"
                                    label={t('loadRisk.highTsb.label')}
                                    explanation={t('loadRisk.highTsb.explanation')}
                                />
                                <Input
                                    id="loadRiskHighTsb"
                                    variant="boxed"
                                    type="number"
                                    step="1"
                                    value={settings.thresholds.loadRiskHighTsb}
                                    onChange={(e) => setSettings((current) => ({ ...current, thresholds: { ...current.thresholds, loadRiskHighTsb: Number(e.target.value) } }))}
                                    disabled={saving}
                                />
                            </div>
                            <div className="space-y-2">
                                <LoadRiskFieldLabel
                                    htmlFor="loadRiskModerateTsb"
                                    label={t('loadRisk.moderateTsb.label')}
                                    explanation={t('loadRisk.moderateTsb.explanation')}
                                />
                                <Input
                                    id="loadRiskModerateTsb"
                                    variant="boxed"
                                    type="number"
                                    step="1"
                                    value={settings.thresholds.loadRiskModerateTsb}
                                    onChange={(e) => setSettings((current) => ({ ...current, thresholds: { ...current.thresholds, loadRiskModerateTsb: Number(e.target.value) } }))}
                                    disabled={saving}
                                />
                            </div>
                            <div className="space-y-2">
                                <LoadRiskFieldLabel
                                    htmlFor="loadRiskLowStimulusTsb"
                                    label={t('loadRisk.lowStimulusTsb.label')}
                                    explanation={t('loadRisk.lowStimulusTsb.explanation')}
                                />
                                <Input
                                    id="loadRiskLowStimulusTsb"
                                    variant="boxed"
                                    type="number"
                                    step="1"
                                    value={settings.thresholds.loadRiskLowStimulusTsb}
                                    onChange={(e) => setSettings((current) => ({ ...current, thresholds: { ...current.thresholds, loadRiskLowStimulusTsb: Number(e.target.value) } }))}
                                    disabled={saving}
                                />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Workout Matching */}
                    <Card className={`${PAPER_BG} border border-endurix-black/10 dark:border-border`}>
                        <CardHeader className="border-b border-endurix-black/10 dark:border-border flex flex-row items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-endurix-black/8 dark:bg-white/8">
                                    <Link2 className="h-4 w-4 text-endurix-orange" />
                                </div>
                                <CardTitle className="text-base uppercase tracking-widest" style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}>
                                    {t('workoutMatchingCard.title')}
                                </CardTitle>
                            </div>
                            <DashboardCardHeaderDots />
                        </CardHeader>
                        <CardContent className="p-6 space-y-5">
                            <div className="flex items-center justify-between gap-4">
                                <div className="space-y-1">
                                    <Label className={FIELD_LABEL} style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}>
                                        {t('workoutMatchingCard.autoLink.label')}
                                    </Label>
                                    <p className="text-[10px] text-muted-foreground italic">{t('workoutMatchingCard.autoLink.help')}</p>
                                </div>
                                <Switch
                                    checked={settings.preferences.workoutMatching.autoLink}
                                    onCheckedChange={(checked) =>
                                        setSettings((current) => ({
                                            ...current,
                                            preferences: {
                                                ...current.preferences,
                                                workoutMatching: { autoLink: checked },
                                            },
                                        }))
                                    }
                                    disabled={saving}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Dashboard Defaults */}
                    <Card className={`${PAPER_BG} border border-endurix-black/10 dark:border-border`}>
                        <CardHeader className="border-b border-endurix-black/10 dark:border-border flex flex-row items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-endurix-black/8 dark:bg-white/8">
                                    <LayoutDashboard className="h-4 w-4 text-endurix-orange" />
                                </div>
                                <CardTitle className="text-base uppercase tracking-widest" style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}>
                                    {t('dashboardCard.title')}
                                </CardTitle>
                            </div>
                            <DashboardCardHeaderDots />
                        </CardHeader>
                        <CardContent className="p-6 space-y-5">
                            <div className="space-y-2">
                                <Label className={FIELD_LABEL} style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}>
                                    {t('dashboardCard.priorityFirst.label')}
                                </Label>
                                <Select
                                    value={settings.preferences.dashboard.priorityOrder[0]}
                                    onValueChange={(value) => {
                                        const first = value as DashboardPriorityItem;
                                        const rest = (['load_risk', 'compliance', 'rpe_mismatch'] as DashboardPriorityItem[]).filter((i) => i !== first);
                                        setSettings((current) => ({
                                            ...current,
                                            preferences: {
                                                ...current.preferences,
                                                dashboard: { priorityOrder: [first, ...rest] },
                                            },
                                        }));
                                    }}
                                    disabled={saving}
                                >
                                    <SelectTrigger className="h-12 rounded-none border-endurix-black/20 dark:border-border bg-transparent font-mono text-sm">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="load_risk">{t('dashboardCard.priorityFirst.options.load_risk')}</SelectItem>
                                        <SelectItem value="compliance">{t('dashboardCard.priorityFirst.options.compliance')}</SelectItem>
                                        <SelectItem value="rpe_mismatch">{t('dashboardCard.priorityFirst.options.rpe_mismatch')}</SelectItem>
                                    </SelectContent>
                                </Select>
                                <p className="text-[10px] text-muted-foreground px-1 italic">{t('dashboardCard.priorityFirst.help')}</p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Planning Defaults */}
                    <Card className={`${PAPER_BG} border border-endurix-black/10 dark:border-border`}>
                        <CardHeader className="border-b border-endurix-black/10 dark:border-border flex flex-row items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-endurix-black/8 dark:bg-white/8">
                                    <CalendarDays className="h-4 w-4 text-endurix-orange" />
                                </div>
                                <CardTitle className="text-base uppercase tracking-widest" style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}>
                                    {t('planningCard.title')}
                                </CardTitle>
                            </div>
                            <DashboardCardHeaderDots />
                        </CardHeader>
                        <CardContent className="p-6 space-y-5">
                            <div className="space-y-2">
                                <Label htmlFor="defaultRpe" className={FIELD_LABEL} style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}>
                                    {t('planningCard.defaultRpe.label')}
                                </Label>
                                <Input
                                    id="defaultRpe"
                                    variant="boxed"
                                    type="number"
                                    min={1}
                                    max={10}
                                    value={settings.preferences.planning.defaultRpe}
                                    onChange={(e) =>
                                        setSettings((current) => ({
                                            ...current,
                                            preferences: {
                                                ...current.preferences,
                                                planning: { ...current.preferences.planning, defaultRpe: Number(e.target.value) },
                                            },
                                        }))
                                    }
                                    disabled={saving}
                                />
                                <p className="text-[10px] text-muted-foreground px-1 italic">{t('planningCard.defaultRpe.help')}</p>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="restDaysPerWeek" className={FIELD_LABEL} style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}>
                                    {t('planningCard.restDaysPerWeek.label')}
                                </Label>
                                <Input
                                    id="restDaysPerWeek"
                                    variant="boxed"
                                    type="number"
                                    min={0}
                                    max={7}
                                    value={settings.preferences.planning.restDaysPerWeek}
                                    onChange={(e) =>
                                        setSettings((current) => ({
                                            ...current,
                                            preferences: {
                                                ...current.preferences,
                                                planning: { ...current.preferences.planning, restDaysPerWeek: Number(e.target.value) },
                                            },
                                        }))
                                    }
                                    disabled={saving}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className={FIELD_LABEL} style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}>
                                    {t('planningCard.weekStartsOn.label')}
                                </Label>
                                <Select
                                    value={settings.preferences.planning.weekStartsOn}
                                    onValueChange={(value) =>
                                        setSettings((current) => ({
                                            ...current,
                                            preferences: {
                                                ...current.preferences,
                                                planning: { ...current.preferences.planning, weekStartsOn: value as 'monday' | 'sunday' },
                                            },
                                        }))
                                    }
                                    disabled={saving}
                                >
                                    <SelectTrigger className="h-12 rounded-none border-endurix-black/20 dark:border-border bg-transparent font-mono text-sm">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="monday">{t('planningCard.weekStartsOn.monday')}</SelectItem>
                                        <SelectItem value="sunday">{t('planningCard.weekStartsOn.sunday')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Strava / Import */}
                    <Card className={`${PAPER_BG} border border-endurix-black/10 dark:border-border`}>
                        <CardHeader className="border-b border-endurix-black/10 dark:border-border flex flex-row items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-endurix-black/8 dark:bg-white/8">
                                    <RefreshCw className="h-4 w-4 text-endurix-orange" />
                                </div>
                                <CardTitle className="text-base uppercase tracking-widest" style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}>
                                    {t('stravaCard.title')}
                                </CardTitle>
                            </div>
                            <DashboardCardHeaderDots />
                        </CardHeader>
                        <CardContent className="p-6 space-y-5">
                            <div className="flex items-center justify-between gap-4">
                                <div className="space-y-1">
                                    <Label className={FIELD_LABEL} style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}>
                                        {t('stravaCard.autoMatch.label')}
                                    </Label>
                                    <p className="text-[10px] text-muted-foreground italic">{t('stravaCard.autoMatch.help')}</p>
                                </div>
                                <Switch
                                    checked={settings.preferences.strava.autoMatch}
                                    onCheckedChange={(checked) =>
                                        setSettings((current) => ({
                                            ...current,
                                            preferences: {
                                                ...current.preferences,
                                                strava: { ...current.preferences.strava, autoMatch: checked },
                                            },
                                        }))
                                    }
                                    disabled={saving}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className={FIELD_LABEL} style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}>
                                    {t('stravaCard.duplicateHandling.label')}
                                </Label>
                                <Select
                                    value={settings.preferences.strava.duplicateHandling}
                                    onValueChange={(value) =>
                                        setSettings((current) => ({
                                            ...current,
                                            preferences: {
                                                ...current.preferences,
                                                strava: { ...current.preferences.strava, duplicateHandling: value as 'skip' | 'flag' | 'replace' },
                                            },
                                        }))
                                    }
                                    disabled={saving}
                                >
                                    <SelectTrigger className="h-12 rounded-none border-endurix-black/20 dark:border-border bg-transparent font-mono text-sm">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="skip">{t('stravaCard.duplicateHandling.options.skip')}</SelectItem>
                                        <SelectItem value="flag">{t('stravaCard.duplicateHandling.options.flag')}</SelectItem>
                                        <SelectItem value="replace">{t('stravaCard.duplicateHandling.options.replace')}</SelectItem>
                                    </SelectContent>
                                </Select>
                                <p className="text-[10px] text-muted-foreground px-1 italic">{t('stravaCard.duplicateHandling.help')}</p>
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
                        {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t('saving')}</> : t('save')}
                    </Button>
                </div>
            </div>
        </TooltipProvider>
    );
}
