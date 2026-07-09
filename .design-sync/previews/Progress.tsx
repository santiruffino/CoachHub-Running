import * as React from 'react';
import { Progress } from '@/components/ui/progress';

export const Default = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 16, maxWidth: 320 }}>
    <Progress value={0} />
    <Progress value={25} />
    <Progress value={65} />
    <Progress value={100} />
  </div>
);
