import * as React from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle, AlertTriangle } from 'lucide-react';

// AlertDialog previews show the visual content directly (dialog portal renders to body).
const surface: React.CSSProperties = {
  background: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: 8,
  boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
  padding: 24,
  maxWidth: 420,
};

export const Error = () => (
  <div style={{ padding: 16 }}>
    <div style={{ ...surface, borderLeft: '4px solid hsl(var(--destructive))' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <AlertCircle style={{ width: 20, height: 20, color: 'hsl(var(--destructive))' }} />
        <h2 style={{ fontSize: 15, fontWeight: 600 }}>Sync failed</h2>
      </div>
      <p style={{ fontSize: 13, color: 'hsl(var(--muted-foreground))', marginBottom: 20 }}>
        Could not connect to Garmin. Please check your credentials and try again.
      </p>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <Button variant="outline" size="sm">Cancel</Button>
        <Button variant="destructive" size="sm">Try again</Button>
      </div>
    </div>
  </div>
);

export const Success = () => (
  <div style={{ padding: 16 }}>
    <div style={{ ...surface, borderLeft: '4px solid #22c55e' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <CheckCircle style={{ width: 20, height: 20, color: '#22c55e' }} />
        <h2 style={{ fontSize: 15, fontWeight: 600 }}>Workout assigned</h2>
      </div>
      <p style={{ fontSize: 13, color: 'hsl(var(--muted-foreground))', marginBottom: 20 }}>
        The training plan has been successfully assigned to all athletes in the group.
      </p>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button size="sm">Done</Button>
      </div>
    </div>
  </div>
);

export const Warning = () => (
  <div style={{ padding: 16 }}>
    <div style={{ ...surface, borderLeft: '4px solid #eab308' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <AlertTriangle style={{ width: 20, height: 20, color: '#eab308' }} />
        <h2 style={{ fontSize: 15, fontWeight: 600 }}>Overload detected</h2>
      </div>
      <p style={{ fontSize: 13, color: 'hsl(var(--muted-foreground))', marginBottom: 20 }}>
        The athlete's acute:chronic ratio is above 1.5. Consider reducing training load this week.
      </p>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <Button variant="outline" size="sm">Adjust plan</Button>
        <Button size="sm">Acknowledge</Button>
      </div>
    </div>
  </div>
);
