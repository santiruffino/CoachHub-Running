import * as React from 'react';
import { MonospaceLabel } from '@/components/dashboard/MonospaceLabel';

export const Colors = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 16 }}>
    <MonospaceLabel color="default">Default label</MonospaceLabel>
    <MonospaceLabel color="muted">Muted label</MonospaceLabel>
    <MonospaceLabel color="primary">Primary label</MonospaceLabel>
    <MonospaceLabel color="orange">Orange label</MonospaceLabel>
    <MonospaceLabel color="danger">Danger label</MonospaceLabel>
  </div>
);

export const Sizes = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 16 }}>
    <MonospaceLabel size="sm">Small · Training Block A</MonospaceLabel>
    <MonospaceLabel size="xs">XS · Week 12 / 16</MonospaceLabel>
    <MonospaceLabel size="micro">Micro · CTL / ATL / TSB</MonospaceLabel>
  </div>
);

export const InContext = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: 16 }}>
    <MonospaceLabel size="xs" color="muted">Last sync</MonospaceLabel>
    <p style={{ fontSize: 18, fontWeight: 600 }}>2 hours ago</p>
    <MonospaceLabel size="micro" color="orange">Via Garmin Connect</MonospaceLabel>
  </div>
);
