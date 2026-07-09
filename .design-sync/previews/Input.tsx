import * as React from 'react';
import { Input } from '@/components/ui/input';

export const Default = () => (
  <div style={{ padding: 16, maxWidth: 320 }}>
    <Input placeholder="Enter your name…" />
  </div>
);

export const States = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 16, maxWidth: 320 }}>
    <Input placeholder="Default" />
    <Input placeholder="Disabled" disabled />
    <Input defaultValue="With value" />
    <Input type="email" placeholder="email@example.com" />
    <Input type="number" placeholder="0" min={0} />
    <Input type="password" placeholder="Password" />
  </div>
);
