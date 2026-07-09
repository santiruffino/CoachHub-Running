import * as React from 'react';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

// Minimal form rendered as static preview (useForm requires runtime hooks)
export const Static = () => (
  <div style={{ padding: 16, maxWidth: 400 }}>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <label style={{ fontSize: 13, fontWeight: 500 }}>Full name</label>
        <Input placeholder="Martina García" />
        <p style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))' }}>Your name as it appears on reports.</p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <label style={{ fontSize: 13, fontWeight: 500 }}>Email</label>
        <Input type="email" placeholder="martina@example.com" />
        <p style={{ fontSize: 11, color: 'hsl(var(--destructive))' }}>Email is required.</p>
      </div>
      <Button variant="orange" style={{ width: 'fit-content' }}>Save profile</Button>
    </div>
  </div>
);
