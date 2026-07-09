import * as React from 'react';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from '@/components/ui/select';

export const Default = () => (
  <div style={{ padding: 16 }}>
    <Select>
      <SelectTrigger style={{ width: 220 }}>
        <SelectValue placeholder="Select a sport" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Sports</SelectLabel>
          <SelectItem value="running">Running</SelectItem>
          <SelectItem value="cycling">Cycling</SelectItem>
          <SelectItem value="triathlon">Triathlon</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  </div>
);

export const WithValue = () => (
  <div style={{ padding: 16 }}>
    <Select defaultValue="running">
      <SelectTrigger style={{ width: 220 }}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="running">Running</SelectItem>
        <SelectItem value="cycling">Cycling</SelectItem>
        <SelectItem value="triathlon">Triathlon</SelectItem>
      </SelectContent>
    </Select>
  </div>
);
