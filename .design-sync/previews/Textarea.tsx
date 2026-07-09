import * as React from 'react';
import { Textarea } from '@/components/ui/textarea';

export const Default = () => (
  <div style={{ padding: 16, maxWidth: 400 }}>
    <Textarea placeholder="Write a note for your athlete…" rows={4} />
  </div>
);

export const States = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 16, maxWidth: 400 }}>
    <Textarea placeholder="Default" rows={3} />
    <Textarea placeholder="Disabled" disabled rows={3} />
    <Textarea defaultValue="Pre-filled content goes here." rows={3} />
  </div>
);
