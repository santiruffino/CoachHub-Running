'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import api from '@/lib/axios';
import { appLogger } from '@/lib/app-logger';
import { trackOnboardingCompleted, trackOnboardingFailed, trackOnboardingStarted } from '@/lib/analytics/events';

export default function CoachOnboardingForm() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [bio, setBio] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [experience, setExperience] = useState('');
  const hasTrackedStartRef = useRef(false);

  const completionPercent = useMemo(() => {
    const completed = [bio, specialty, experience].filter((v) => v.trim().length > 0).length;
    return Math.round((completed / 3) * 100);
  }, [bio, specialty, experience]);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'COACH')) {
      router.replace('/dashboard');
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    const loadStatus = async () => {
      try {
        const response = await api.get('/v2/onboarding/coach');
        if (response.data.isCompleted) {
          router.replace('/dashboard');
          return;
        }
      } catch (error) {
        appLogger.error('coach_onboarding.status_failed', { error });
      } finally {
        setLoading(false);
      }
    };

    if (user?.role === 'COACH') {
      void loadStatus();
    }
  }, [user?.role, router]);

  useEffect(() => {
    if (!hasTrackedStartRef.current && !loading && user?.role === 'COACH') {
      trackOnboardingStarted({ role: 'COACH', flow: 'coach_dedicated' });
      hasTrackedStartRef.current = true;
    }
  }, [loading, user?.role]);

  if (authLoading || loading || user?.role !== 'COACH') {
    return null;
  }

  return (
    <div className="min-h-screen bg-endurix-paper dark:bg-background px-4 py-10">
      <div className="max-w-3xl mx-auto space-y-6">
        <Card className="bg-endurix-paper dark:bg-card border border-endurix-black/10 dark:border-border">
          <CardHeader className="border-b border-endurix-black/10 dark:border-border">
            <CardTitle className="text-xl uppercase tracking-tight" style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}>Coach Onboarding</CardTitle>
            <CardDescription>
              Complete your coaching profile and we will bootstrap starter templates for your team.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 p-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-endurix-black/50 dark:text-muted-foreground" style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}>
                <span>Completion tracker</span>
                <span>{completionPercent}%</span>
              </div>
              <Progress value={completionPercent} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio" className="text-[10px] uppercase tracking-widest text-endurix-black/50 dark:text-muted-foreground" style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}>Coach bio</Label>
              <Input
                id="bio"
                variant="boxed"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Your coaching background"
                aria-describedby="bio-help"
              />
              <p id="bio-help" className="text-xs text-muted-foreground">
                Helps athletes understand your approach.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="specialty" className="text-[10px] uppercase tracking-widest text-endurix-black/50 dark:text-muted-foreground" style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}>Specialty</Label>
              <Input
                id="specialty"
                variant="boxed"
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
                placeholder="e.g. Marathon, Trail, 10K progression"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="experience" className="text-[10px] uppercase tracking-widest text-endurix-black/50 dark:text-muted-foreground" style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}>Experience</Label>
              <Input
                id="experience"
                variant="boxed"
                value={experience}
                onChange={(e) => setExperience(e.target.value)}
                placeholder="e.g. 8 years, federation certified"
              />
            </div>

            {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}

            <div className="flex justify-end">
              <Button
                variant="orange"
                onClick={async () => {
                  try {
                    setSaving(true);
                    setError('');
                    await api.post('/v2/onboarding/coach', {
                      bio,
                      specialty,
                      experience,
                    });
                    trackOnboardingCompleted({ role: 'COACH', flow: 'coach_dedicated' });
                    router.replace('/dashboard');
                  } catch (error) {
                    appLogger.error('coach_onboarding.submit_failed', { error });
                    setError('Failed to complete onboarding. Please try again.');
                    trackOnboardingFailed({ role: 'COACH', flow: 'coach_dedicated', reason: 'request_failed' });
                  } finally {
                    setSaving(false);
                  }
                }}
                disabled={saving}
                className="uppercase tracking-widest text-xs"
              >
                {saving ? 'Saving...' : 'Complete Onboarding'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
