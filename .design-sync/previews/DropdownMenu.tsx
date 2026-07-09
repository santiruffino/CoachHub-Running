import * as React from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

export const Preview = () => (
  <div style={{ padding: 16 }}>
    <DropdownMenu defaultOpen>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">Actions</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent style={{ minWidth: 180 }}>
        <DropdownMenuLabel>Athlete</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem>View profile</DropdownMenuItem>
        <DropdownMenuItem>Assign workout</DropdownMenuItem>
        <DropdownMenuItem>Send message</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem style={{ color: 'hsl(var(--destructive))' }}>Remove athlete</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
);
