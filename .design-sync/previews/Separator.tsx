import * as React from 'react';
import { Separator } from '@/components/ui/separator';

export const Horizontal = () => (
  <div style={{ padding: 16, maxWidth: 320 }}>
    <p style={{ fontSize: 14, marginBottom: 8 }}>Section A</p>
    <Separator />
    <p style={{ fontSize: 14, marginTop: 8 }}>Section B</p>
  </div>
);

export const Vertical = () => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 16 }}>
    <span style={{ fontSize: 14 }}>Blog</span>
    <Separator orientation="vertical" style={{ height: 16 }} />
    <span style={{ fontSize: 14 }}>Docs</span>
    <Separator orientation="vertical" style={{ height: 16 }} />
    <span style={{ fontSize: 14 }}>API</span>
  </div>
);
