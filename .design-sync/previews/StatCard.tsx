import * as React from 'react';
import { StatCard } from '@/components/dashboard/StatCard';
import { TooltipProvider } from '@/components/ui/tooltip';

export const Default = () => (
  <TooltipProvider>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1, padding: 16, maxWidth: 480, background: 'hsl(var(--border))' }}>
      <StatCard label="CTL" value="68" chip="+3.2" chipColor="orange" footerLabel="Fitness trend" />
      <StatCard label="ATL" value="82" chip="High" chipColor="red" footerLabel="Fatigue load" />
      <StatCard label="TSB" value="-14" chip="Caution" chipColor="neutral" footerLabel="Form score" />
      <StatCard label="ACWR" value="1.3" chip="Risk zone" chipColor="red" footerLabel="Workload ratio" tooltip="Acute:Chronic workload ratio. Values above 1.5 indicate injury risk." />
    </div>
  </TooltipProvider>
);

export const Simple = () => (
  <TooltipProvider>
    <div style={{ padding: 16, maxWidth: 240 }}>
      <StatCard label="Weekly TSS" value="312" chip="+18%" chipColor="green" footerLabel="vs last week" />
    </div>
  </TooltipProvider>
);
