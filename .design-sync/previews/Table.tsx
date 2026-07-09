import * as React from 'react';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

const activities = [
  { date: 'Jun 30', type: 'Run', distance: '12.3 km', pace: '5:12/km', tss: 78 },
  { date: 'Jun 28', type: 'Run', distance: '8.0 km', pace: '5:05/km', tss: 55 },
  { date: 'Jun 26', type: 'Run', distance: '18.5 km', pace: '5:28/km', tss: 112 },
];

export const Default = () => (
  <div style={{ padding: 16 }}>
    <Table>
      <TableCaption>Recent activities</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Distance</TableHead>
          <TableHead>Pace</TableHead>
          <TableHead style={{ textAlign: 'right' }}>TSS</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {activities.map((a) => (
          <TableRow key={a.date}>
            <TableCell style={{ color: 'hsl(var(--muted-foreground))' }}>{a.date}</TableCell>
            <TableCell><Badge variant="tag">{a.type}</Badge></TableCell>
            <TableCell>{a.distance}</TableCell>
            <TableCell>{a.pace}</TableCell>
            <TableCell style={{ textAlign: 'right', fontWeight: 600 }}>{a.tss}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </div>
);
