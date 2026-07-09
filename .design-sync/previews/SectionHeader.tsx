import * as React from 'react';
import { SectionHeader } from '@/components/dashboard/SectionHeader';
import { Button } from '@/components/ui/button';

export const Default = () => (
  <div style={{ padding: 16, maxWidth: 600 }}>
    <SectionHeader
      eyebrow="Season 2026"
      title="Training Overview"
      description="Your performance metrics and training load for the current block."
    />
  </div>
);

export const WithAction = () => (
  <div style={{ padding: 16, maxWidth: 600 }}>
    <SectionHeader
      eyebrow="Group · Runners Elite"
      title="Athletes"
      description="Manage and monitor your athletes in this group."
      action={<Button variant="orange" size="sm">Add athlete</Button>}
    />
  </div>
);

export const Sizes = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 24, padding: 16, maxWidth: 600 }}>
    <SectionHeader size="lg" title="Large header" description="Used for primary page sections." />
    <SectionHeader size="md" title="Medium header" description="Default size for most sections." />
    <SectionHeader size="sm" title="Small header" description="Compact sections and sidebars." />
  </div>
);
