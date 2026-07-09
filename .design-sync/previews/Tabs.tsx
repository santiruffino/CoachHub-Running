import * as React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export const Default = () => (
  <div style={{ padding: 16, maxWidth: 480 }}>
    <Tabs defaultValue="overview">
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="activities">Activities</TabsTrigger>
        <TabsTrigger value="training">Training Plan</TabsTrigger>
      </TabsList>
      <TabsContent value="overview">
        <div style={{ padding: '16px 0', fontSize: 14 }}>Overview content: weekly totals, trend charts, and key metrics.</div>
      </TabsContent>
      <TabsContent value="activities">
        <div style={{ padding: '16px 0', fontSize: 14 }}>Recent activities list with pace, distance, and heart rate data.</div>
      </TabsContent>
      <TabsContent value="training">
        <div style={{ padding: '16px 0', fontSize: 14 }}>Assigned workout plan for the current training block.</div>
      </TabsContent>
    </Tabs>
  </div>
);
