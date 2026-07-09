import * as React from 'react';
import { ProgressBar } from '@/components/dashboard/ProgressBar';

export const Default = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 16, maxWidth: 360 }}>
    <ProgressBar value={0} />
    <ProgressBar value={35} />
    <ProgressBar value={68} />
    <ProgressBar value={100} />
  </div>
);

export const WithLabels = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 16, maxWidth: 360 }}>
    <ProgressBar value={72} showLabel label="Weekly volume" />
    <ProgressBar value={45} showLabel label="Intensity target" />
    <ProgressBar value={90} showLabel label="Recovery score" />
  </div>
);
