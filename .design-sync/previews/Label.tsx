import * as React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

export const Default = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 16, maxWidth: 320 }}>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <Label htmlFor="athlete-name">Athlete Name</Label>
      <Input id="athlete-name" placeholder="Enter name" />
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <Label htmlFor="coach-notes">Coach Notes</Label>
      <Input id="coach-notes" placeholder="Add notes" />
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <Label htmlFor="weight" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        Target Weight <span style={{ color: 'hsl(var(--muted-foreground))' }}>(optional)</span>
      </Label>
      <Input id="weight" type="number" placeholder="kg" />
    </div>
  </div>
);
