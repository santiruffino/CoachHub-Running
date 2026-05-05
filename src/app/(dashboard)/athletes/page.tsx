'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, UserPlus, AlertTriangle, Mail, MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertDialog } from '@/components/ui/AlertDialog';
import api from '@/lib/axios';
import { InviteAthleteModal } from '@/features/invitations/components/InviteAthleteModal';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { EditAthleteModal } from './components/EditAthleteModal';

import { AthleteData } from '@/interfaces/athlete';

interface AthleteApiItem {
  id: string;
  name?: string;
  email: string;
  coach?: {
    id: string;
    name: string;
  } | null;
  groups?: Array<{ id: string; name: string }>;
  stats?: {
    totalAssignments?: number;
    plannedAssignments?: number;
    completedAssignments?: number;
    completionPercentage?: number;
  };
}

interface CoachApiItem {
  id: string;
  name: string;
}

const AVATAR_COLORS = [
  'bg-blue-600',
  'bg-purple-600',
  'bg-pink-600',
  'bg-indigo-600',
  'bg-cyan-600',
  'bg-teal-600',
];

function determineLevelFromCount(completedTrainings: number, t: ReturnType<typeof useTranslations>): string {
  if (completedTrainings >= 50) return t('levels.elite');
  if (completedTrainings >= 30) return t('levels.advanced');
  if (completedTrainings >= 10) return t('levels.intermediate');
  return t('levels.beginner');
}

export default function AthletesPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [athletes, setAthletes] = useState<AthleteData[]>([]);
  const [coaches, setCoaches] = useState<{id: string, name: string}[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modals & Action States
  const [searchTerm, setSearchTerm] = useState('');
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  
  const [editAthlete, setEditAthlete] = useState<AthleteData | null>(null);
  const [isEditModalOpen, setEditModalOpen] = useState(false);
  
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filter States
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [filterGroup, setFilterGroup] = useState<string>('all');
  const [filterCoach, setFilterCoach] = useState<string>('all');

  const t = useTranslations('athletes');
  const tDashboard = useTranslations('dashboard');
  const tA11y = useTranslations('common.a11y');

  const fetchAthletes = useCallback(async () => {
    try {
      setLoading(true);
      const athletesRes = await api.get<AthleteApiItem[]>('/v2/users/athletes');
      const athletesList = athletesRes.data;

      const athletesData: AthleteData[] = athletesList.map((athlete) => ({
        id: athlete.id,
        name: athlete.name || athlete.email.split('@')[0],
        email: athlete.email,
        sport: t('sports.running'),
        level: determineLevelFromCount(athlete.stats?.completedAssignments || 0, t),
        coach: athlete.coach,
        groups: athlete.groups || [],
        totalTrainings: athlete.stats?.totalAssignments || 0,
        plannedTrainings: athlete.stats?.plannedAssignments || 0,
        completedTrainings: athlete.stats?.completedAssignments || 0,
        completionPercentage: athlete.stats?.completionPercentage || 0,
      }));

      setAthletes(athletesData);

      if (isAdmin) {
        const coachesRes = await api.get<CoachApiItem[]>('/v2/users/coaches');
        setCoaches(coachesRes.data.map((c) => ({ id: c.id, name: c.name })));
      }
    } catch (error) {
      console.error('Failed to fetch athletes', error);
    } finally {
      setLoading(false);
    }
  }, [isAdmin, t]);

  useEffect(() => {
    void fetchAthletes();
  }, [fetchAthletes]);

  const handleDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      await api.delete(`/v2/users/${deleteId}`);
      // Optimistically update the UI instead of re-fetching
      setAthletes(prev => prev.filter(a => a.id !== deleteId));
      setDeleteId(null);
    } catch (error) {
      console.error('Failed to delete athlete', error);
      alert(t('deleteFailed'));
    } finally {
      setIsDeleting(false);
    }
  };

  // Extract unique groups and levels for filters
  const availableGroups = Array.from(new Set(athletes.flatMap(a => a.groups.map(g => g.name))));
  const availableLevels = Array.from(new Set(athletes.map(a => a.level)));

  const filteredAthletes = athletes.filter((athlete) => {
    const matchesSearch = athlete.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          athlete.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLevel = filterLevel === 'all' || athlete.level === filterLevel;
    const matchesGroup = filterGroup === 'all' || athlete.groups.some(g => g.name === filterGroup);
    
    // For ADMINs only, if filterCoach is employed
    const matchesCoach = !isAdmin || filterCoach === 'all' || athlete.coach?.id === filterCoach;

    return matchesSearch && matchesLevel && matchesGroup && matchesCoach;
  });

  if (loading) {
    return (
      <div className="p-8 space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
  <div className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-display tracking-tight text-foreground">{t('title')} {isAdmin && ' (Global)'}</h1>
        </div>
        <Button onClick={() => setInviteModalOpen(true)} size="sm" className="sm:size-default">
          <UserPlus className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">{t('addAthlete')}</span>
        </Button>
      </div>

      <InviteAthleteModal
        open={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
      />
      <EditAthleteModal 
        open={isEditModalOpen} 
        onClose={() => setEditModalOpen(false)}
        athlete={editAthlete}
        onSuccess={fetchAthletes}
        isAdmin={isAdmin}
        coaches={coaches}
      />
      
      <AlertDialog 
        open={!!deleteId} 
        onClose={() => { if (!isDeleting) setDeleteId(null); }}
        onConfirm={handleDelete}
        type="warning"
        title={t('deleteTitle')}
        message={t('deleteMessage')}
        confirmText={t('deleteConfirm')}
        loading={isDeleting}
      />

      {/* Filters Strip */}
      <div className="flex flex-col sm:flex-row gap-4 flex-wrap">
        <div className="relative max-w-md w-full sm:w-auto flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={filterLevel} onValueChange={setFilterLevel}>
          <SelectTrigger className="w-full sm:w-[150px]">
             <SelectValue placeholder={t('filters.level')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('filters.allLevels')}</SelectItem>
            {availableLevels.map(lvl => (
               <SelectItem key={lvl} value={lvl}>{lvl}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterGroup} onValueChange={setFilterGroup}>
          <SelectTrigger className="w-full sm:w-[150px]">
             <SelectValue placeholder={t('filters.group')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('filters.allGroups')}</SelectItem>
            {availableGroups.map(grp => (
               <SelectItem key={grp} value={grp}>{grp}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {isAdmin && (
          <Select value={filterCoach} onValueChange={setFilterCoach}>
            <SelectTrigger className="w-full sm:w-[180px]">
               <SelectValue placeholder={t('filters.coach')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('filters.allCoaches')}</SelectItem>
              {coaches.map(c => (
                 <SelectItem key={c.id} value={c.id}>{c.name || tDashboard('admin.noName')}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Mobile Cards View */}
      <div className="lg:hidden space-y-3">
        {filteredAthletes.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              {t('noAthletes')}
            </CardContent>
          </Card>
        ) : (
          filteredAthletes.map((athlete, idx) => (
            <Card key={athlete.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Avatar className={`h-12 w-12 ${AVATAR_COLORS[idx % AVATAR_COLORS.length]}`}>
                      <AvatarFallback className="bg-transparent text-white font-semibold">
                        {athlete.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{athlete.name}</p>
                      {isAdmin && athlete.coach && (
                        <p className="text-xs text-primary font-medium">{t('filters.coach')}: {athlete.coach.name}</p>
                      )}
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                        <Mail className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{athlete.email}</span>
                      </div>
                    </div>
                  </div>
                  {/* Actions Dropdown Mobile */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-5 w-5 text-muted-foreground" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => { setEditAthlete(athlete); setEditModalOpen(true); }}>
                        <Edit className="mr-2 h-4 w-4" /> {t('edit')}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => setDeleteId(athlete.id)}>
                        <Trash2 className="mr-2 h-4 w-4" /> {t('delete')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="flex gap-2">
                  <Button asChild variant="outline" size="sm" className="flex-1">
                    <Link href={`/athletes/${athlete.id}`}>
                      {t('viewProfile')}
                    </Link>
                  </Button>
                  <Button asChild size="sm" className="flex-1">
                    <Link href={`/workouts/assign?athleteId=${athlete.id}`}>
                      {t('assignWorkout')}
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Desktop Table View */}
      <Card className="hidden lg:block">
        <CardContent className="p-0">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[280px]">{t('table.athlete')}</TableHead>
                  <TableHead>{t('table.sport')}</TableHead>
                  <TableHead>{t('table.level')}</TableHead>
                  {isAdmin && <TableHead>{t('filters.coach')}</TableHead>}
                  <TableHead className="text-center">{t('table.trainings')}</TableHead>
                  <TableHead className="text-center">{t('table.planned')}</TableHead>
                  <TableHead className="w-[150px]">{t('table.compliance')}</TableHead>
                  <TableHead className="text-right w-[180px]">{t('table.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAthletes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isAdmin ? 9 : 8} className="text-center py-12 text-muted-foreground">
                      {t('noAthletes')}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAthletes.map((athlete, idx) => (
                    <TableRow key={athlete.id}>
                      {/* Athlete Info */}
                      <TableCell>
                      <Link href={`/athletes/${athlete.id}`}>
                        <div className="flex items-center gap-3">
                          <Avatar className={`h-10 w-10 ${AVATAR_COLORS[idx % AVATAR_COLORS.length]}`}>
                            <AvatarFallback className="bg-transparent text-white font-semibold">
                              {athlete.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-medium truncate">{athlete.name}</p>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                              <Mail className="h-3 w-3 flex-shrink-0" />
                              <span className="truncate">{athlete.email}</span>
                            </div>
                          </div>
                        </div>
                      </Link>
                      </TableCell>

                      <TableCell><Badge variant="outline">{athlete.sport}</Badge></TableCell>
                      <TableCell><span className="text-sm font-medium">{athlete.level}</span></TableCell>
                      {isAdmin && (
                        <TableCell>
                          <span className="text-sm font-medium text-primary block truncate max-w-[120px]">
                            {athlete.coach?.name || '-'}
                          </span>
                        </TableCell>
                      )}

                      <TableCell className="text-center"><span className="font-medium">{athlete.totalTrainings}</span></TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <span className="font-medium">{athlete.plannedTrainings}</span>
                          {athlete.plannedTrainings < 3 && (
                            <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0" />
                          )}
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium text-xs">{athlete.completionPercentage}%</span>
                          </div>
                          <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-foreground transition-all rounded-full"
                              style={{ width: `${athlete.completionPercentage}%` }}
                            />
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button asChild variant="outline" size="sm">
                            <Link href={`/athletes/${athlete.id}`}>{t('viewProfile')}</Link>
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <span className="sr-only">{tA11y('openMenu')}</span>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link href={`/workouts/assign?athleteId=${athlete.id}`}>
                                  {t('assignWorkout')}
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => { setEditAthlete(athlete); setEditModalOpen(true); }}>
                                {t('edit')}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => setDeleteId(athlete.id)}>
                                {t('delete')}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
