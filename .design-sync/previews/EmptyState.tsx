import * as React from 'react';
import { EmptyState } from '@/components/ui/EmptyState';
import { Activity, Users, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const Default = () => (
  <div style={{ padding: 32, maxWidth: 440 }}>
    <EmptyState
      icon={Activity}
      title="No activities yet"
      description="Connect your Garmin or Strava account to sync your training activities."
    >
      <Button variant="orange">Connect device</Button>
    </EmptyState>
  </div>
);

export const WithoutIcon = () => (
  <div style={{ padding: 32, maxWidth: 440 }}>
    <EmptyState
      title="No athletes in this group"
      description="Add athletes to start assigning workouts and tracking progress."
    />
  </div>
);

export const Variants = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 24, padding: 16 }}>
    <EmptyState icon={Activity} title="No activities" description="Your activity feed is empty." />
    <EmptyState icon={Users} title="No athletes" description="You haven't added any athletes yet." />
    <EmptyState icon={Calendar} title="No upcoming races" description="Add races to your calendar to track your goals." />
  </div>
);
