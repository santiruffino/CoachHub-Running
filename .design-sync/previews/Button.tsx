import * as React from 'react';
import { Button } from '@/components/ui/button';

export const AllVariants = () => (
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: 16 }}>
    <Button variant="default">Default</Button>
    <Button variant="outline">Outline</Button>
    <Button variant="secondary">Secondary</Button>
    <Button variant="ghost">Ghost</Button>
    <Button variant="destructive">Destructive</Button>
    <Button variant="link">Link</Button>
    <Button variant="orange">Orange</Button>
    <Button variant="outline-brand">Outline Brand</Button>
  </div>
);

export const Sizes = () => (
  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, padding: 16 }}>
    <Button size="lg">Large</Button>
    <Button size="default">Default</Button>
    <Button size="sm">Small</Button>
    <Button size="xs">Extra Small</Button>
  </div>
);

export const States = () => (
  <div style={{ display: 'flex', gap: 8, padding: 16 }}>
    <Button variant="orange">Active</Button>
    <Button variant="orange" disabled>Disabled</Button>
  </div>
);
