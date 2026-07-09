import * as React from 'react';
import { Badge } from '@/components/ui/badge';

export const AllVariants = () => (
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: 16 }}>
    <Badge variant="default">Default</Badge>
    <Badge variant="secondary">Secondary</Badge>
    <Badge variant="outline">Outline</Badge>
    <Badge variant="destructive">Destructive</Badge>
    <Badge variant="solid">Solid</Badge>
    <Badge variant="orange">Orange</Badge>
    <Badge variant="tag">Tag</Badge>
  </div>
);

export const InContext = () => (
  <div style={{ display: 'flex', gap: 8, padding: 16, alignItems: 'center' }}>
    <Badge variant="orange">PRO</Badge>
    <Badge variant="solid">NEW</Badge>
    <Badge variant="tag">Running</Badge>
    <Badge variant="outline">Draft</Badge>
    <Badge variant="destructive">Error</Badge>
  </div>
);
