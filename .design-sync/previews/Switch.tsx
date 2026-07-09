import * as React from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

export const Default = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 16 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <Switch id="push" />
      <Label htmlFor="push">Push notifications</Label>
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <Switch id="email" defaultChecked />
      <Label htmlFor="email">Email alerts</Label>
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <Switch id="disabled" disabled />
      <Label htmlFor="disabled" style={{ opacity: 0.5 }}>Disabled</Label>
    </div>
  </div>
);
