import * as React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export const Default = () => (
  <div style={{ padding: 16, maxWidth: 360 }}>
    <Card>
      <CardHeader>
        <CardTitle>Weekly Training Summary</CardTitle>
        <CardDescription>Your performance for the week of June 30</CardDescription>
      </CardHeader>
      <CardContent>
        <p style={{ fontSize: 14 }}>Total distance: 48.2 km · Time: 4h 12m · TSS: 312</p>
      </CardContent>
      <CardFooter style={{ gap: 8 }}>
        <Button variant="orange" size="sm">View details</Button>
        <Button variant="outline" size="sm">Share</Button>
      </CardFooter>
    </Card>
  </div>
);

export const Compact = () => (
  <div style={{ padding: 16, maxWidth: 280 }}>
    <Card>
      <CardHeader>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <CardTitle style={{ fontSize: 16 }}>Athlete Status</CardTitle>
          <Badge variant="solid">Active</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p style={{ fontSize: 13, color: 'hsl(var(--muted-foreground))' }}>Last activity 2 days ago</p>
      </CardContent>
    </Card>
  </div>
);
