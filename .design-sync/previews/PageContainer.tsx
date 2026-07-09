import * as React from 'react';
import { PageContainer } from '@/components/layout/PageContainer';

export const Default = () => (
  <div style={{ background: 'hsl(var(--background))', minHeight: 200 }}>
    <PageContainer>
      <div style={{ padding: '16px 0', fontSize: 14 }}>
        <p style={{ fontWeight: 600, marginBottom: 8 }}>Default width (7xl)</p>
        <p style={{ color: 'hsl(var(--muted-foreground))' }}>Content is constrained to max-w-7xl and centered. Used for list and dashboard views.</p>
      </div>
    </PageContainer>
  </div>
);

export const Narrow = () => (
  <div style={{ background: 'hsl(var(--background))', minHeight: 200 }}>
    <PageContainer width="narrow">
      <div style={{ padding: '16px 0', fontSize: 14 }}>
        <p style={{ fontWeight: 600, marginBottom: 8 }}>Narrow width</p>
        <p style={{ color: 'hsl(var(--muted-foreground))' }}>Constrained width for forms, settings, and single-column content.</p>
      </div>
    </PageContainer>
  </div>
);
