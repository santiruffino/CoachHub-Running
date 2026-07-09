import * as React from 'react';
import { Slider } from '@/components/ui/slider';

export const Default = () => (
  <div style={{ padding: '16px 24px', maxWidth: 320 }}>
    <Slider defaultValue={[65]} max={100} step={1} />
  </div>
);

export const Range = () => (
  <div style={{ padding: '16px 24px', maxWidth: 320 }}>
    <Slider defaultValue={[20, 80]} max={100} step={5} />
  </div>
);

export const WithSteps = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '16px 24px', maxWidth: 320 }}>
    <Slider defaultValue={[0]} max={100} step={1} />
    <Slider defaultValue={[50]} max={100} step={10} />
    <Slider defaultValue={[100]} max={100} step={1} disabled />
  </div>
);
