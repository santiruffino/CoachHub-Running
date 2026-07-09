import * as React from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';

export const Default = () => (
  <TooltipProvider>
    <div style={{ display: 'flex', gap: 12, padding: 40, justifyContent: 'center' }}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline" size="sm">TSS</Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Training Stress Score — measures overall load for a session.</p>
        </TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline" size="sm">CTL</Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Chronic Training Load — your fitness trend over ~42 days.</p>
        </TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline" size="sm">ATL</Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Acute Training Load — fatigue over the last ~7 days.</p>
        </TooltipContent>
      </Tooltip>
    </div>
  </TooltipProvider>
);
