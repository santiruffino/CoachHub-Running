'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useTranslations } from 'next-intl';

interface ZoneComplianceCardProps {
    compliance: {
        compliance_score: number;
        is_violation: boolean;
        violation_details: {
            targets: number[];
            distribution: Array<{
                min: number;
                max: number;
                time: number;
            }>;
        };
    };
}

export function ZoneComplianceCard({ compliance }: ZoneComplianceCardProps) {
    const t = useTranslations('activities.detail.compliance');

    const data = compliance.violation_details.distribution.map((d, i) => ({
        name: `Z${i + 1}`,
        time: Math.round(d.time / 60), // minutes
        isTarget: compliance.violation_details.targets.includes(i + 1)
    }));

    return (
        <Card className={`border-2 ${compliance.is_violation ? 'border-red-500/20 bg-red-500/5' : 'border-green-500/20 bg-green-500/5'}`}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="flex items-center gap-2">
                    {compliance.is_violation ? (
                        <AlertCircle className="w-5 h-5 text-red-500" />
                    ) : (
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                    )}
                    <CardTitle className="text-lg font-bold">
                        {compliance.is_violation ? t('violationTitle') : t('compliantTitle')}
                    </CardTitle>
                </div>
                <Badge variant={compliance.is_violation ? "destructive" : "default"} className="text-lg px-3 py-1">
                    {compliance.compliance_score.toFixed(0)}%
                </Badge>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground mb-6">
                    {compliance.is_violation ? t('violationDesc') : t('compliantDesc')}
                </p>

                <div className="h-[200px] w-full mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                            <XAxis 
                                dataKey="name" 
                                axisLine={false} 
                                tickLine={false} 
                                style={{ fontSize: '10px', fill: '#9CA3AF' }}
                            />
                            <YAxis hide />
                            <Tooltip 
                                cursor={{fill: 'transparent'}}
                                content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                        return (
                                            <div className="bg-gray-900 border border-gray-700 p-2 rounded shadow-lg backdrop-blur-sm bg-opacity-90">
                                                <p className="font-bold text-white text-xs mb-1">{payload[0].payload.name}</p>
                                                <p className="text-xs text-gray-300">{payload[0].value} min</p>
                                                {payload[0].payload.isTarget && (
                                                    <p className="text-[10px] text-cyan-400 uppercase font-bold mt-1">{t('targetZone')}</p>
                                                )}
                                            </div>
                                        );
                                    }
                                    return null;
                                }}
                            />
                            <Bar dataKey="time" radius={[4, 4, 0, 0]}>
                                {data.map((entry, index) => (
                                    <Cell 
                                        key={`cell-${index}`} 
                                        fill={entry.isTarget ? '#06B6D4' : '#374151'} 
                                        fillOpacity={entry.isTarget ? 0.8 : 0.4}
                                    />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                <div className="flex justify-center gap-6 mt-4 pt-4 border-t border-gray-800/50">
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-cyan-500 opacity-80" />
                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">{t('targetZones')}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-gray-600 opacity-40" />
                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">{t('otherZones')}</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
