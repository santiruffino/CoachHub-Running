import * as React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export const Default = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 16, maxWidth: 440 }}>
    <Alert>
      <AlertTitle>New training plan assigned</AlertTitle>
      <AlertDescription>Your coach has updated your plan for next week. Review it before your next session.</AlertDescription>
    </Alert>
    <Alert variant="destructive">
      <AlertTitle>Sync failed</AlertTitle>
      <AlertDescription>Could not sync your latest Garmin activity. Please reconnect your device.</AlertDescription>
    </Alert>
  </div>
);
