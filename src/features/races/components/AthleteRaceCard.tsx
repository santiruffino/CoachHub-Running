'use client';

import { AthleteRace } from '@/interfaces/race';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Calendar, CheckCircle2, ChevronRight, MapPin, Timer, Trophy } from 'lucide-react';
import { differenceInDays, startOfDay } from 'date-fns';

interface AthleteRaceCardProps {
  race: AthleteRace;
  isHistory: boolean;
  t: (key: string, values?: Record<string, string | number>) => string;
  onRecordResult: (race: AthleteRace) => void;
}

export function AthleteRaceCard({ race, isHistory, t, onRecordResult }: AthleteRaceCardProps) {
  const raceDate = new Date(race.date);
  const daysLeft = differenceInDays(raceDate, startOfDay(new Date()));
  const raceName = race.name_override || race.race?.name || t('athlete.defaultRaceName');

  return (
    <div className={cn(
      'group relative bg-endurix-paper dark:bg-card border border-endurix-black/10 dark:border-border p-5 transition-colors hover:border-endurix-orange/40',
      isHistory && 'opacity-75 grayscale-[0.2]'
    )}>
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className={cn(
            'p-3 transition-colors',
            isHistory ? 'bg-endurix-black/8 dark:bg-white/8 text-muted-foreground' : 'bg-endurix-orange/10 text-endurix-orange'
          )}>
            {isHistory ? <CheckCircle2 className="h-5 w-5" /> : <Trophy className="h-5 w-5" />}
          </div>
          <div>
            <h3
              className="text-lg font-medium leading-tight group-hover:text-endurix-orange transition-colors text-endurix-black dark:text-foreground uppercase tracking-tight"
              style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}
            >
              {raceName}
            </h3>
            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              <span>{new Date(race.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
            </div>
          </div>
        </div>

        {!isHistory && race.priority === 'A' && daysLeft >= 0 && daysLeft <= 30 && (
          <div
            className="bg-endurix-orange/10 text-endurix-orange text-[10px] font-bold px-2 py-1 border border-endurix-orange/30 animate-pulse uppercase tracking-widest"
            style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}
          >
            T - {t('athlete.daysLeft', { days: daysLeft })}
          </div>
        )}
      </div>

      <div className="space-y-3 mb-6">
        <div className="flex justify-between items-center text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span>{t('library.locationLabel')}</span>
          </div>
          <span className="font-medium text-endurix-black dark:text-foreground truncate max-w-[150px]">
            {race.race?.location || '-'}
          </span>
        </div>

        <div className="flex justify-between items-center text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Timer className="h-4 w-4" />
            <span>{isHistory ? t('athlete.resultTime') : t('assign.targetTimeLabel')}</span>
          </div>
          <span
            className="font-medium text-endurix-orange bg-endurix-orange/10 px-2 py-0.5 border border-endurix-orange/20"
            style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}
          >
            {isHistory ? (race.result_time || '-') : (race.target_time || '-')}
          </span>
        </div>

        <div className="flex justify-between items-center text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Trophy className="h-4 w-4" />
            <span>{t('assign.priorityLabel')}</span>
          </div>
          <span className={cn(
            'text-[10px] font-bold px-2 py-0.5 border uppercase tracking-wider',
            race.priority === 'A' ? 'bg-red-500/10 text-red-500 border-red-500/30' :
              race.priority === 'B' ? 'bg-amber-500/10 text-amber-500 border-amber-500/30' :
                'bg-blue-500/10 text-blue-500 border-blue-500/30'
          )}
            style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}
          >
            {t('athlete.priorityLabel', { priority: race.priority })}
          </span>
        </div>
      </div>

      <div className="pt-4 border-t border-endurix-black/10 dark:border-border flex gap-2">
        {isHistory && race.status === 'PLANNED' ? (
          <Button
            variant="outline-brand"
            size="sm"
            className="w-full text-xs font-bold uppercase tracking-wider"
            onClick={() => onRecordResult(race)}
          >
            {t('recordResult')}
          </Button>
        ) : (
          <Button variant="ghost" size="sm" className="w-full group/btn text-xs font-bold text-endurix-orange hover:bg-endurix-orange/5 uppercase tracking-wider">
            <span>{t('library.viewDetails')}</span>
            <ChevronRight className="h-3.5 w-3.5 ml-1 transition-transform group-hover/btn:translate-x-1" />
          </Button>
        )}
      </div>
    </div>
  );
}
