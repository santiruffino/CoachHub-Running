'use client';
import { appLogger } from '@/lib/app-logger';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, Plus, MapPin, Trophy, MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { AlertDialog } from '@/components/ui/AlertDialog';
import { AthleteRaceCard } from '@/features/races/components/AthleteRaceCard';
import { RaceDialog } from '@/features/races/components/RaceDialog';
import { RecordRaceResultModal } from '@/features/races/components/RecordRaceResultModal';
import { racesService } from '@/features/races/services/races.service';
import { Race, AthleteRace } from '@/interfaces/race';
import { isPast } from 'date-fns';

interface RacesListProps {
    initialRaces: Race[];
    initialAthleteRaces: AthleteRace[];
    isCoach: boolean;
    userId: string;
}

export function RacesList({ initialRaces, initialAthleteRaces, isCoach, userId }: RacesListProps) {
  const t = useTranslations('races');

  // State for Race Templates (Coach View)
  const [races, setRaces] = useState<Race[]>(initialRaces);
  // State for Athlete Races (Athlete View)
  const [athleteRaces, setAthleteRaces] = useState<AthleteRace[]>(initialAthleteRaces);
  
  const [searchTerm, setSearchTerm] = useState('');
  
  // Dialogs
  const [isRaceDialogOpen, setIsRaceDialogOpen] = useState(false);
  const [selectedRace, setSelectedRace] = useState<Race | null>(null);
  const [isResultModalOpen, setIsResultModalOpen] = useState(false);
  const [selectedAthleteRace, setSelectedAthleteRace] = useState<AthleteRace | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchRaces = async () => {
    try {
      if (isCoach) {
        const res = await racesService.findAll();
        setRaces(res.data);
      } else {
        const res = await racesService.findByUser(userId);
        setAthleteRaces(res.data);
      }
    } catch (error) {
      appLogger.error('Failed to fetch races', error);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      await racesService.delete(deleteId);
      setRaces(prev => prev.filter(r => r.id !== deleteId));
      setDeleteId(null);
    } catch (error) {
      appLogger.error('Failed to delete race', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredRaces = races.filter(race => 
    race.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (race.location && race.location.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const { activeRaces, pastRaces } = useMemo(() => {
    const sorted = [...athleteRaces].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return {
      activeRaces: sorted.filter(r => !isPast(new Date(r.date)) || r.status === 'PLANNED'),
      pastRaces: sorted.filter(r => isPast(new Date(r.date)) && r.status !== 'PLANNED').reverse()
    };
  }, [athleteRaces]);

  const handleRecordResult = (race: AthleteRace) => {
    setSelectedAthleteRace(race);
    setIsResultModalOpen(true);
  };

  // Coach View
  if (isCoach) {
    return (
      <PageContainer className="space-y-8">
        <PageHeader
          className="mb-0"
          title={t('library.title')}
          description={t('library.subtitle')}
          action={
            <Button variant="orange" onClick={() => { setSelectedRace(null); setIsRaceDialogOpen(true); }} className="font-bold uppercase tracking-widest">
              <Plus className="h-4 w-4 mr-2" />
              {t('library.createTemplate')}
            </Button>
          }
        />

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            variant="boxed"
            placeholder={t('library.searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-11"
          />
        </div>

        {filteredRaces.length === 0 ? (
          <EmptyState
            icon={Trophy}
            title={t('library.noRaces')}
            action={
              <Button variant="ghost" onClick={() => setIsRaceDialogOpen(true)} className="text-endurix-orange font-bold uppercase tracking-wider text-xs">
                {t('library.createFirstTemplate')}
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRaces.map((race) => (
              <Card key={race.id} className="bg-endurix-paper dark:bg-card border border-endurix-black/10 dark:border-border overflow-hidden hover:border-endurix-orange/40 transition-colors group">
                <CardHeader className="p-6 pb-2 flex flex-row items-start justify-between space-y-0">
                  <div className="space-y-1">
                    <CardTitle
                      className="text-xl font-medium group-hover:text-endurix-orange transition-colors uppercase tracking-tight"
                      style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}
                    >
                      {race.name}
                    </CardTitle>
                    <div
                      className="flex items-center text-endurix-orange font-bold text-sm bg-endurix-orange/10 px-2 py-0.5 border border-endurix-orange/30 w-fit uppercase tracking-wider"
                      style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}
                    >
                      <Trophy className="h-3.5 w-3.5 mr-1.5" />
                      {race.distance || '-'}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => { setSelectedRace(race); setIsRaceDialogOpen(true); }}>
                        <Edit className="h-4 w-4 mr-2" />
                        {t('library.edit')}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeleteId(race.id)}>
                        <Trash2 className="h-4 w-4 mr-2" />
                        {t('library.delete')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardHeader>
                <CardContent className="p-6 pt-2 space-y-4">
                  {race.location && (
                    <div className="flex items-center text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4 mr-1.5 text-endurix-orange/70" />
                      <span className="truncate">{race.location}</span>
                    </div>
                  )}
                  {race.description && (
                    <p className="text-sm line-clamp-2 text-muted-foreground leading-relaxed">
                      {race.description}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <RaceDialog
          open={isRaceDialogOpen}
          onOpenChange={setIsRaceDialogOpen}
          race={selectedRace}
          onSuccess={fetchRaces}
        />

        <AlertDialog
          open={!!deleteId}
          onClose={() => setDeleteId(null)}
          onConfirm={handleDelete}
          title={t('library.deleteConfirm')}
          message={t('library.deleteDescription') || '¿Estás seguro de eliminar esta plantilla?'}
          confirmText={t('library.delete')}
          type="warning"
          loading={isDeleting}
        />
      </PageContainer>
    );
  }

  // Athlete View
  return (
    <PageContainer className="space-y-12 pb-20">
      <PageHeader
        className="mb-0"
        backHref="/dashboard"
        title={t('athlete.upcomingTitle')}
        description={t('athlete.manageSubtitle')}
      />

      {/* Active Races */}
      <div className="space-y-6">
            <h2
              className="text-lg font-bold flex items-center gap-2 uppercase tracking-tight"
              style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}
            >
              <span className="w-2 h-2 bg-endurix-orange animate-pulse" />
              {t('athlete.activeRaces')}
            </h2>

        {activeRaces.length === 0 ? (
          <EmptyState icon={Trophy} title={t('athlete.noRaces')} className="py-12" />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeRaces.map(race => (
              <AthleteRaceCard
                key={race.id}
                race={race}
                isHistory={false}
                t={t}
                onRecordResult={handleRecordResult}
              />
            ))}
          </div>
        )}
      </div>

      {/* History */}
      {pastRaces.length > 0 && (
        <div className="space-y-6">
          <h2
            className="text-lg font-medium flex items-center gap-2 text-muted-foreground uppercase tracking-tight"
            style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}
          >
            <span className="w-2 h-2 bg-muted-foreground/40" />
            {t('library.finishedRaces')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pastRaces.map(race => (
              <AthleteRaceCard
                key={race.id}
                race={race}
                isHistory
                t={t}
                onRecordResult={handleRecordResult}
              />
            ))}
          </div>
        </div>
      )}

      <RecordRaceResultModal
        open={isResultModalOpen}
        onOpenChange={setIsResultModalOpen}
        race={selectedAthleteRace}
        onSuccess={fetchRaces}
      />
    </PageContainer>
  );
}
