import * as React from 'react';
import { MetricCard } from '@/components/dashboard/MetricCard';

export const Default = () => (
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: 16 }}>
    <MetricCard title="Total Distance" value="48.2 km" />
    <MetricCard title="Training Load" value="312" valueColor="text-endurix-orange" />
    <MetricCard title="Active Days" value="5" />
    <MetricCard title="Avg Pace" value="5:12" valueColor="text-green-600" />
  </div>
);
