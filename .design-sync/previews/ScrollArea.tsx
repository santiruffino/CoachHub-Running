import * as React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

const athletes = ['Ana Rodríguez', 'Martina García', 'Juan Pérez', 'Carlos López', 'Sofía Martínez', 'Diego Torres', 'Lucía Fernández', 'Mateo González', 'Valentina Cruz', 'Sebastián Ruiz'];

export const Default = () => (
  <div style={{ padding: 16 }}>
    <ScrollArea style={{ height: 200, width: 240, border: '1px solid hsl(var(--border))', borderRadius: 6 }}>
      <div style={{ padding: '8px 12px' }}>
        <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'hsl(var(--muted-foreground))', marginBottom: 8 }}>Athletes</p>
        {athletes.map((name, i) => (
          <React.Fragment key={name}>
            <p style={{ fontSize: 13, padding: '6px 0' }}>{name}</p>
            {i < athletes.length - 1 && <Separator />}
          </React.Fragment>
        ))}
      </div>
    </ScrollArea>
  </div>
);
