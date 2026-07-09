import * as React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export const Card = () => (
  <div style={{ padding: 16, maxWidth: 320 }}>
    <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
      <Skeleton style={{ height: 40, width: 40, borderRadius: '50%' }} />
      <div style={{ flex: 1 }}>
        <Skeleton style={{ height: 14, width: '60%', marginBottom: 6 }} />
        <Skeleton style={{ height: 12, width: '40%' }} />
      </div>
    </div>
    <Skeleton style={{ height: 12, marginBottom: 6 }} />
    <Skeleton style={{ height: 12, marginBottom: 6 }} />
    <Skeleton style={{ height: 12, width: '70%' }} />
  </div>
);

export const Metrics = () => (
  <div style={{ display: 'flex', gap: 12, padding: 16 }}>
    {[1, 2, 3].map((i) => (
      <div key={i} style={{ flex: 1, padding: 16, border: '1px solid hsl(var(--border))', borderRadius: 6 }}>
        <Skeleton style={{ height: 10, width: '60%', marginBottom: 12 }} />
        <Skeleton style={{ height: 28, width: '80%' }} />
      </div>
    ))}
  </div>
);
