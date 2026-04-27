'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Building2, UserCircle2, Activity } from 'lucide-react';
import api from '@/lib/axios';
import { useTranslations } from 'next-intl';

import { Coach } from '@/interfaces/coach';

interface AdminData {
  metrics: {
    totalAthletes: number;
    totalCoaches: number;
    totalGroups: number;
  };
  coaches: Coach[];
}

export default function AdminDashboard({ user }: { user: any }) {
  const [data, setData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(true);
  const t = useTranslations();

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await api.get('/v2/dashboard/admin');
        setData(res.data);
      } catch (error) {
        console.error('Failed to fetch admin dashboard data', error);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  if (loading || !data) {
    return (
      <div className="space-y-8 p-8">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold font-display tracking-tight text-foreground">{t('dashboard.admin.title')}</h1>
        <p className="text-muted-foreground mt-2">{t('dashboard.admin.welcome')}</p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {/* Metric Cards */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t('dashboard.admin.metrics.totalAthletes')}</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.metrics.totalAthletes}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t('dashboard.admin.metrics.totalGroups')}</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.metrics.totalGroups}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t('dashboard.admin.metrics.activeCoaches')}</CardTitle>
            <UserCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.metrics.totalCoaches}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard.admin.coachesActivity')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.coaches.map((coach) => (
                <div key={coach.id} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                      {coach.name ? coach.name.charAt(0).toUpperCase() : 'C'}
                    </div>
                    <div>
                      <p className="font-medium">{coach.name || t('dashboard.admin.noName')}</p>
                      <p className="text-sm text-muted-foreground">{coach.email}</p>
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    <p className="flex items-center gap-2 justify-end">
                      <Users className="h-3 w-3" /> {t('dashboard.admin.athletesCount', { count: coach.totalAthletes })}
                    </p>
                    <p className="text-muted-foreground flex items-center gap-2 justify-end mt-1">
                      <Activity className="h-3 w-3" /> 
                      {coach.lastActivity ? new Date(coach.lastActivity).toLocaleDateString() : t('dashboard.admin.noActivity')}
                    </p>
                  </div>
                </div>
              ))}
              
              {data.coaches.length === 0 && (
                <p className="text-muted-foreground text-center py-4">{t('dashboard.admin.noCoaches')}</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
