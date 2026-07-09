import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// Dialog previews show the visual content directly (Radix portal renders to body,
// not #root, so we render the dialog surface inline for the preview card).
const dialogSurface: React.CSSProperties = {
  background: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: 8,
  boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
  padding: 24,
  maxWidth: 440,
};

export const EditProfile = () => (
  <div style={{ padding: 16 }}>
    <div style={dialogSurface}>
      <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Edit athlete profile</h2>
      <p style={{ fontSize: 13, color: 'hsl(var(--muted-foreground))', marginBottom: 16 }}>
        Update the athlete's details. Changes take effect immediately.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
        <div>
          <Label htmlFor="name-prev">Name</Label>
          <Input id="name-prev" defaultValue="Martina García" style={{ marginTop: 4 }} />
        </div>
        <div>
          <Label htmlFor="email-prev">Email</Label>
          <Input id="email-prev" type="email" defaultValue="martina@example.com" style={{ marginTop: 4 }} />
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <Button variant="outline" size="sm">Cancel</Button>
        <Button variant="orange" size="sm">Save changes</Button>
      </div>
    </div>
  </div>
);

export const ConfirmDelete = () => (
  <div style={{ padding: 16 }}>
    <div style={dialogSurface}>
      <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Remove athlete</h2>
      <p style={{ fontSize: 13, color: 'hsl(var(--muted-foreground))', marginBottom: 20 }}>
        Are you sure you want to remove this athlete from the group? Their data will be preserved.
      </p>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <Button variant="outline" size="sm">Cancel</Button>
        <Button variant="destructive" size="sm">Remove</Button>
      </div>
    </div>
  </div>
);
