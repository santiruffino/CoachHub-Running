'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from 'lucide-react';

interface NextCompetitionProps {
  name: string;
  daysUntil: number;
  goal: string;
}

export function NextCompetition({ name, daysUntil, goal }: NextCompetitionProps) {
  return (
    <Card className="bg-primary text-primary-foreground">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Calendar className="h-4 w-4" />
          Próxima Competición
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h3 className="text-2xl font-bold mb-1">{name}</h3>
          <p className="text-sm opacity-90">Faltan {daysUntil} días</p>
        </div>
        <div className="bg-primary-foreground/10 rounded-lg p-3">
          <p className="text-xs font-medium opacity-90 mb-1">OBJETIVO</p>
          <p className="text-lg font-bold">{goal}</p>
        </div>
      </CardContent>
    </Card>
  );
}
