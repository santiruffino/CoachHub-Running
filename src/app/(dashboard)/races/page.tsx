'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, Plus, MapPin, Trophy, MoreHorizontal, Edit, Trash2, ArrowLeft } from 'lucide-react';
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
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { isPast } from 'date-fns';

export default function RacesPage() {
  const router = useRouter();
  const t = useTranslations('races');
  const { user } = useAuth();
  const isCoach = user?.role === 'COACH' || user?.role === 'ADMIN';

  // State for Race Templates (Coach View)
  const [races, setRaces] = useState<Race[]>([]);
  // State for Athlete Races (Athlete View)
  const [athleteRaces, setAthleteRaces] = useState<AthleteRace[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Dialogs
  const [isRaceDialogOpen, setIsRaceDialogOpen] = useState(false);
  const [selectedRace, setSelectedRace] = useState<Race | null>(null);
  const [isResultModalOpen, setIsResultModalOpen] = useState(false);
  const [selectedAthleteRace, setSelectedAthleteRace] = useState<AthleteRace | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      if (isCoach) {
        const res = await racesService.findAll();
        setRaces(res.data);
      } else {
        const res = await racesService.findByUser(user.id);
        setAthleteRaces(res.data);
      }
    } catch (error) {
      console.error('Failed to fetch races', error);
    } finally {
      setLoading(false);
    }
  }, [isCoach, user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      await racesService.delete(deleteId);
      setRaces(prev => prev.filter(r => r.id !== deleteId));
      setDeleteId(null);
    } catch (error) {
      console.error('Failed to delete race', error);
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

  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 lg:pt-0 space-y-8">
        <div className="flex justify-between items-center">
          <Skeleton className="h-10 w-48 rounded-xl" />
          <Skeleton className="h-10 w-32 rounded-xl" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-64 rounded-3xl" />)}
        </div>
      </div>
    );
  }

  // Coach View
  if (isCoach) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold font-display tracking-tight text-foreground">{t('library.title')}</h1>
            <p className="text-muted-foreground mt-1">{t('library.subtitle')}</p>
          </div>
          <Button onClick={() => { setSelectedRace(null); setIsRaceDialogOpen(true); }} className="rounded-xl font-bold shadow-md">
            <Plus className="h-4 w-4 mr-2" />
            {t('library.createTemplate')}
          </Button>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('library.searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-card border-none shadow-sm h-11 rounded-xl focus-visible:ring-1 focus-visible:ring-primary/20"
          />
        </div>

        {filteredRaces.length === 0 ? (
          <Card className="border-dashed bg-muted/20 border-2 rounded-[2rem] py-20">
            <CardContent className="flex flex-col items-center justify-center text-center">
              <div className="bg-muted p-4 rounded-full mb-4">
                <Trophy className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground font-manrope font-medium">{t('library.noRaces')}</p>
              <Button variant="ghost" onClick={() => setIsRaceDialogOpen(true)} className="mt-4 text-primary font-bold">
                {t('library.createFirstTemplate')}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRaces.map((race) => (
              <Card key={race.id} className="bg-card border-border/40 rounded-[2rem] overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 group">
                <CardHeader className="p-6 pb-2 flex flex-row items-start justify-between space-y-0">
                  <div className="space-y-1">
                    <CardTitle className="text-xl font-bold font-manrope group-hover:text-primary transition-colors">{race.name}</CardTitle>
                    <div className="flex items-center text-primary font-bold text-sm bg-primary/5 px-2 py-0.5 rounded-lg w-fit">
                      <Trophy className="h-3.5 w-3.5 mr-1.5" />
                      {race.distance || '-'}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="rounded-xl border-none shadow-xl">
                      <DropdownMenuItem onClick={() => { setSelectedRace(race); setIsRaceDialogOpen(true); }} className="rounded-lg">
                        <Edit className="h-4 w-4 mr-2" />
                        {t('library.edit')}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-red-600 focus:text-red-600 rounded-lg" onClick={() => setDeleteId(race.id)}>
                        <Trash2 className="h-4 w-4 mr-2" />
                        {t('library.delete')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardHeader>
                <CardContent className="p-6 pt-2 space-y-4">
                  {race.location && (
                    <div className="flex items-center text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4 mr-1.5 text-primary/60" />
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
          onSuccess={fetchData} 
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
      </div>
    );
  }

  // Athlete View
  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-12 pb-20">
      <div className="flex items-center gap-4 mb-2">
        <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
        >
            <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-display tracking-tight text-foreground">{t('athlete.upcomingTitle')}</h1>
          <p className="text-muted-foreground mt-1">{t('athlete.manageSubtitle')}</p>
        </div>
      </div>

      {/* Active Races */}
      <div className="space-y-6">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              {t('athlete.activeRaces')}
            </h2>
        
        {activeRaces.length === 0 ? (
          <Card className="border-dashed bg-muted/10 border-2 rounded-[2rem] py-12">
            <CardContent className="flex flex-col items-center justify-center text-center">
              <Trophy className="h-8 w-8 text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground font-manrope italic">{t('athlete.noRaces')}</p>
            </CardContent>
          </Card>
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
          <h2 className="text-lg font-bold font-display tracking-tight flex items-center gap-2 text-muted-foreground">
            <span className="w-2 h-2 rounded-full bg-muted-foreground/40" />
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
        onSuccess={fetchData}
      />
    </div>
  );
}
