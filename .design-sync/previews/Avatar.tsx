import * as React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export const Default = () => (
  <div style={{ display: 'flex', gap: 12, padding: 16, alignItems: 'center' }}>
    <Avatar>
      <AvatarImage src="https://github.com/shadcn.png" alt="Avatar" />
      <AvatarFallback>SC</AvatarFallback>
    </Avatar>
    <Avatar>
      <AvatarFallback>MG</AvatarFallback>
    </Avatar>
    <Avatar>
      <AvatarFallback>JR</AvatarFallback>
    </Avatar>
    <Avatar>
      <AvatarFallback style={{ background: 'hsl(var(--accent))', color: 'hsl(var(--accent-foreground))' }}>AB</AvatarFallback>
    </Avatar>
  </div>
);

export const WithName = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 16 }}>
    {[
      { initials: 'MG', name: 'Martina García', role: 'Athlete' },
      { initials: 'JP', name: 'Juan Pérez', role: 'Coach' },
      { initials: 'AR', name: 'Ana Rodríguez', role: 'Athlete' },
    ].map((person) => (
      <div key={person.name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Avatar>
          <AvatarFallback>{person.initials}</AvatarFallback>
        </Avatar>
        <div>
          <p style={{ fontSize: 13, fontWeight: 600 }}>{person.name}</p>
          <p style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))' }}>{person.role}</p>
        </div>
      </div>
    ))}
  </div>
);
