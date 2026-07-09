import * as React from 'react';
import { DashboardCard } from '@/components/dashboard/DashboardCard';
import { Button } from '@/components/ui/button';

export const Default = () => (
  <div style={{ padding: 16, maxWidth: 400 }}>
    <DashboardCard headerLabel="Weekly Load">
      <div style={{ padding: '8px 0', fontSize: 14, color: 'hsl(var(--muted-foreground))' }}>
        Content area — charts, metrics, or any component goes here.
      </div>
    </DashboardCard>
  </div>
);

export const WithAccessory = () => (
  <div style={{ padding: 16, maxWidth: 400 }}>
    <DashboardCard
      headerLabel="Athletes"
      headerAccessory={<Button size="xs" variant="outline">View all</Button>}
    >
      <div style={{ padding: '8px 0', fontSize: 14 }}>
        <p>Martina García · 68 TSS</p>
        <p style={{ color: 'hsl(var(--muted-foreground))' }}>Juan Pérez · 45 TSS</p>
      </div>
    </DashboardCard>
  </div>
);

export const Headerless = () => (
  <div style={{ padding: 16, maxWidth: 400 }}>
    <DashboardCard headerless>
      <div style={{ padding: 8, fontSize: 14 }}>No header — full card for charts or custom content.</div>
    </DashboardCard>
  </div>
);
