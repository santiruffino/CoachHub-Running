'use client';

import { Clock, MapPin, Mountain } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useTranslations } from 'next-intl';

interface WeeklySummaryProps {
    summary: {
        distance: { planned: number; completed: number }; // km
        duration: { planned: number; completed: number }; // min
        elevation: { completed: number }; // m
    };
}

export function WeeklySummary({ summary }: WeeklySummaryProps) {
    const t = useTranslations('calendar.weeklySummary');
    const tUnits = useTranslations('common.units');

    return (
        <Card className="p-4 border-gray-100 dark:border-gray-700 shadow-sm bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4 uppercase tracking-wider">{t('title')}</h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-4">
                {/* Distance */}
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-1">
                        <MapPin className="w-4 h-4" />
                        <span className="text-xs font-medium">{t('distance')}</span>
                    </div>
                    <div className="space-y-1">
                        <div className="flex justify-between items-baseline">
                            <span className="text-xs text-gray-400 dark:text-gray-500">{t('planned')}</span>
                            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{summary.distance.planned} {tUnits('km')}</span>
                        </div>
                        <div className="flex justify-between items-baseline">
                            <span className="text-xs text-gray-400 dark:text-gray-500">{t('actual')}</span>
                            <span className={summary.distance.completed >= summary.distance.planned ? "text-sm font-bold text-green-600 dark:text-green-400" : "text-sm font-bold text-orange-500"}>
                                {summary.distance.completed.toFixed(1)} {tUnits('km')}
                            </span>
                        </div>
                        {/* Progress Bar */}
                        <div className="h-1.5 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mt-1">
                            <div
                                className="h-full bg-orange-500 rounded-full"
                                style={{ width: `${Math.min((summary.distance.completed / (summary.distance.planned || 1)) * 100, 100)}%` }}
                            />
                        </div>
                    </div>
                </div>

                {/* Duration */}
                <div className="flex flex-col gap-1 md:border-l border-gray-200 dark:border-gray-700 md:pl-4">
                    <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-1">
                        <Clock className="w-4 h-4" />
                        <span className="text-xs font-medium">{t('time')}</span>
                    </div>
                    <div className="space-y-1">
                        <div className="flex justify-between items-baseline">
                            <span className="text-xs text-gray-400 dark:text-gray-500">{t('planned')}</span>
                            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{Math.round(summary.duration.planned / 60)}{tUnits('h')}</span>
                        </div>
                        <div className="flex justify-between items-baseline">
                            <span className="text-xs text-gray-400 dark:text-gray-500">{t('actual')}</span>
                            <span className={summary.duration.completed >= summary.duration.planned ? "text-sm font-bold text-green-600 dark:text-green-400" : "text-sm font-bold text-orange-500"}>
                                {(summary.duration.completed / 60).toFixed(1)}{tUnits('h')}
                            </span>
                        </div>
                        {/* Progress Bar */}
                        <div className="h-1.5 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mt-1">
                            <div
                                className="h-full bg-blue-500 rounded-full"
                                style={{ width: `${Math.min((summary.duration.completed / (summary.duration.planned || 1)) * 100, 100)}%` }}
                            />
                        </div>
                    </div>
                </div>

                {/* Elevation */}
                <div className="flex flex-col gap-1 md:border-l border-gray-200 dark:border-gray-700 md:pl-4 justify-center">
                    <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-1">
                        <Mountain className="w-4 h-4" />
                        <span className="text-xs font-medium">{t('elevation')}</span>
                    </div>
                    <div>
                        <span className="text-2xl font-bold text-gray-900 dark:text-white">{Math.round(summary.elevation.completed)}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">{tUnits('m')}</span>
                    </div>
                    <span className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">{t('cumulativeTotal')}</span>
                </div>
            </div>
        </Card>
    );
}
