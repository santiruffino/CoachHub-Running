'use client';
import { appLogger } from '@/lib/app-logger';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/layout/PageHeader';
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
import { Search, UserPlus, AlertTriangle, Mail, MoreHorizontal, Edit, Trash2, PauseCircle, PlayCircle } from 'lucide-react';
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
import { EditAthleteModal } from '@/app/(dashboard)/athletes/components/EditAthleteModal';
import { AthleteData, AthleteBillingStatus } from '@/interfaces/athlete';

interface AthleteApiItem {
  id: string;
  name?: string;
  email: string;
  coach?: {
    id: string;
    name: string;
  } | null;
  groups?: Array<{ id: string; name: string }>;
  isPausedManual?: boolean;
  billingStatus?: AthleteBillingStatus;
  pauseReason?: string | null;
  pausedAt?: string | null;
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

function StatusBadge({
  status,
  reason,
  t,
}: {
  status: AthleteBillingStatus;
  reason?: string | null;
  t: ReturnType<typeof useTranslations>;
}) {
  if (status === 'active') return null;

  if (status === 'paused_manual') {
    return (
      <Badge
        variant="secondary"
        title={reason || undefined}
        className="bg-endurix-orange/15 text-endurix-orange border-endurix-orange/30 shrink-0"
      >
        {t('status.pausedManual')}
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      title={t('status.pausedAutoHint')}
      className="text-muted-foreground shrink-0"
    >
      {t('status.pausedAuto')}
    </Badge>
  );
}

interface AthletesListProps {
  initialAthletes: AthleteApiItem[];
  initialCoaches: CoachApiItem[];
  isAdmin: boolean;
}

export function AthletesList({ initialAthletes, initialCoaches, isAdmin }: AthletesListProps) {
  const t = useTranslations('athletes');
  const tDashboard = useTranslations('dashboard');
  const tA11y = useTranslations('common.a11y');

  const mapAthletes = useCallback((list: AthleteApiItem[]): AthleteData[] => {
    return list.map((athlete) => ({
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
      isPausedManual: Boolean(athlete.isPausedManual),
      billingStatus: athlete.billingStatus || 'active',
      pauseReason: athlete.pauseReason ?? null,
      pausedAt: athlete.pausedAt ?? null,
    }));
  }, [t]);

  const [athletes, setAthletes] = useState<AthleteData[]>(mapAthletes(initialAthletes));
  const [coaches] = useState<{id: string, name: string}[]>(initialCoaches);
  const [loading, setLoading] = useState(false);
  const [scope, setScope] = useState<'mine' | 'team'>('mine');
  
  // Modals & Action States
  const [searchTerm, setSearchTerm] = useState('');
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  
  const [editAthlete, setEditAthlete] = useState<AthleteData | null>(null);
  const [isEditModalOpen, setEditModalOpen] = useState(false);
  
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Pause / reactivate (admin-only)
  const [pauseTarget, setPauseTarget] = useState<AthleteData | null>(null);
  const [isPausing, setIsPausing] = useState(false);

  // Filter States
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [filterGroup, setFilterGroup] = useState<string>('all');
  const [filterCoach, setFilterCoach] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const fetchAthletes = useCallback(async (currentScope?: 'mine' | 'team') => {
    try {
      setLoading(true);
      const activeScope = currentScope || scope;
      const athletesRes = await api.get<AthleteApiItem[]>('/v2/users/athletes', { params: { scope: activeScope } });
      setAthletes(mapAthletes(athletesRes.data));
    } catch (error) {
      appLogger.error('Failed to fetch athletes', error);
    } finally {
      setLoading(false);
    }
  }, [scope, mapAthletes]);

  // Refetch when scope changes
  const handleScopeChange = (newScope: 'mine' | 'team') => {
    setScope(newScope);
    void fetchAthletes(newScope);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      await api.delete(`/v2/users/${deleteId}`);
      setAthletes(prev => prev.filter(a => a.id !== deleteId));
      setDeleteId(null);
    } catch (error) {
      appLogger.error('Failed to delete athlete', error);
      alert(t('deleteFailed'));
    } finally {
      setIsDeleting(false);
    }
  };

  const applyPause = async (athlete: AthleteData, paused: boolean) => {
    setIsPausing(true);
    try {
      await api.patch(`/v2/users/${athlete.id}`, { is_paused_manual: paused });
      // Optimistic update; refetch reconciles the derived billing status
      // (e.g. an unpaused athlete may still be paused_auto).
      setAthletes(prev => prev.map(a => a.id === athlete.id
        ? { ...a, isPausedManual: paused, billingStatus: paused ? 'paused_manual' : 'active' }
        : a));
      setPauseTarget(null);
      await fetchAthletes();
    } catch (error) {
      appLogger.error('Failed to update athlete pause state', error);
      alert(t('pause.failed'));
    } finally {
      setIsPausing(false);
    }
  };

  const handlePauseAction = (athlete: AthleteData) => {
    if (athlete.isPausedManual) {
      // Reactivation is non-destructive — apply directly.
      void applyPause(athlete, false);
    } else {
      setPauseTarget(athlete);
    }
  };

  const availableGroups = Array.from(new Set(athletes.flatMap(a => a.groups.map(g => g.name))));
  const availableLevels = Array.from(new Set(athletes.map(a => a.level)));

  const filteredAthletes = athletes.filter((athlete) => {
    const matchesSearch = athlete.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          athlete.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLevel = filterLevel === 'all' || athlete.level === filterLevel;
    const matchesGroup = filterGroup === 'all' || athlete.groups.some(g => g.name === filterGroup);
    const matchesCoach = !isAdmin || filterCoach === 'all' || athlete.coach?.id === filterCoach;
    const matchesStatus = filterStatus === 'all' || athlete.billingStatus === filterStatus;

    return matchesSearch && matchesLevel && matchesGroup && matchesCoach && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${t('title')}${isAdmin ? ` (${tDashboard('admin.globalScope')})` : ''}`}
      />

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

      <AlertDialog
        open={!!pauseTarget}
        onClose={() => { if (!isPausing) setPauseTarget(null); }}
        onConfirm={() => { if (pauseTarget) void applyPause(pauseTarget, true); }}
        type="warning"
        title={t('pause.title')}
        message={t('pause.message')}
        confirmText={t('pause.confirm')}
        loading={isPausing}
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
        <div className="relative w-full sm:w-[260px] lg:w-[280px]">
          <Search className="absolute left-0 top-1/2 ml-2 -translate-y-1/2 h-4 w-4 text-endurix-black/40 dark:text-muted-foreground" />
          <Input
            variant="boxed"
            placeholder={t('searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-7"
          />
        </div>

        {!isAdmin && (
          <Select value={scope} onValueChange={(value) => handleScopeChange(value as 'mine' | 'team')}>
            <SelectTrigger className="w-full sm:w-[220px]">
              <SelectValue placeholder={tDashboard('alerts.myAthletes')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="mine">{tDashboard('alerts.myAthletes')}</SelectItem>
              <SelectItem value="team">{tDashboard('alerts.teamView')}</SelectItem>
            </SelectContent>
          </Select>
        )}

        <Select value={filterLevel} onValueChange={setFilterLevel}>
          <SelectTrigger className="w-full sm:w-[220px]">
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
          <SelectTrigger className="w-full sm:w-[220px]">
             <SelectValue placeholder={t('filters.group')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('filters.allGroups')}</SelectItem>
            {availableGroups.map(grp => (
               <SelectItem key={grp} value={grp}>{grp}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-[220px]">
             <SelectValue placeholder={t('filters.status')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('filters.allStatuses')}</SelectItem>
            <SelectItem value="active">{t('status.active')}</SelectItem>
            <SelectItem value="paused_manual">{t('status.pausedManual')}</SelectItem>
            <SelectItem value="paused_auto">{t('status.pausedAuto')}</SelectItem>
          </SelectContent>
        </Select>

        {isAdmin && (
          <Select value={filterCoach} onValueChange={setFilterCoach}>
            <SelectTrigger className="w-full sm:w-[220px]">
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

        <Button
          type="button"
          variant="orange"
          onClick={() => setInviteModalOpen(true)}
          size="sm"
          className="w-full shrink-0 whitespace-nowrap uppercase tracking-widest lg:ml-auto lg:w-auto"
        >
          <UserPlus className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">{t('addAthlete')}</span>
        </Button>
      </div>

      {/* Mobile Cards View */}
      <div className="lg:hidden space-y-3">
        {loading ? (
           <div className="space-y-3">
             {[1, 2, 3].map(i => <Skeleton key={i} className="h-40 w-full" />)}
           </div>
        ) : filteredAthletes.length === 0 ? (
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
                      <div className="flex items-center gap-2">
                        <p className="font-semibold truncate">{athlete.name}</p>
                        <StatusBadge status={athlete.billingStatus} reason={athlete.pauseReason} t={t} />
                      </div>
                      {isAdmin && athlete.coach && (
                        <p className="text-xs text-endurix-orange font-medium">{t('filters.coach')}: {athlete.coach.name}</p>
                      )}
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                        <Mail className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{athlete.email}</span>
                      </div>
                    </div>
                  </div>
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
                      {isAdmin && (
                        <DropdownMenuItem onClick={() => handlePauseAction(athlete)}>
                          {athlete.isPausedManual
                            ? <><PlayCircle className="mr-2 h-4 w-4" /> {t('pause.reactivate')}</>
                            : <><PauseCircle className="mr-2 h-4 w-4" /> {t('pause.pause')}</>}
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeleteId(athlete.id)}>
                        <Trash2 className="mr-2 h-4 w-4" /> {t('delete')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="flex gap-2">
                  <Button asChild variant="outline-brand" size="sm" className="flex-1 uppercase tracking-widest">
                    <Link href={`/athletes/${athlete.id}`}>
                      {t('viewProfile')}
                    </Link>
                  </Button>
                  <Button asChild variant="orange" size="sm" className="flex-1 uppercase tracking-widest">
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
              {loading ? (
                [1, 2, 3, 4, 5].map(i => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-10 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                    {isAdmin && <TableCell><Skeleton className="h-6 w-32" /></TableCell>}
                    <TableCell><Skeleton className="h-6 w-10 mx-auto" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-10 mx-auto" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-32 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : filteredAthletes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 8 : 7} className="text-center py-12 text-muted-foreground">
                    {t('noAthletes')}
                  </TableCell>
                </TableRow>
              ) : (
                filteredAthletes.map((athlete, idx) => (
                  <TableRow key={athlete.id}>
                    <TableCell>
                    <Link href={`/athletes/${athlete.id}`}>
                      <div className="flex items-center gap-3">
                        <Avatar className={`h-10 w-10 ${AVATAR_COLORS[idx % AVATAR_COLORS.length]}`}>
                          <AvatarFallback className="bg-transparent text-white font-semibold">
                            {athlete.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium truncate">{athlete.name}</p>
                            <StatusBadge status={athlete.billingStatus} reason={athlete.pauseReason} t={t} />
                          </div>
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
                        <span className="text-sm font-medium text-endurix-orange block truncate max-w-[120px]">
                          {athlete.coach?.name || '-'}
                        </span>
                      </TableCell>
                    )}

                    <TableCell className="text-center"><span className="font-medium">{athlete.totalTrainings}</span></TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <span className="font-medium">{athlete.plannedTrainings}</span>
                        {athlete.plannedTrainings < 3 && (
                          <AlertTriangle className="h-4 w-4 text-endurix-orange flex-shrink-0" />
                        )}
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-xs tabular-nums w-10">{athlete.completionPercentage}%</span>
                        <div className="flex-1 h-1.5 bg-endurix-black/10 dark:bg-border">
                          <div
                            className="h-full bg-endurix-orange"
                            style={{ width: `${athlete.completionPercentage}%` }}
                          />
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button asChild variant="outline-brand" size="sm" className="uppercase tracking-widest text-[10px]">
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
                            {isAdmin && (
                              <DropdownMenuItem onClick={() => handlePauseAction(athlete)}>
                                {athlete.isPausedManual ? t('pause.reactivate') : t('pause.pause')}
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeleteId(athlete.id)}>
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
        </CardContent>
      </Card>
    </div>
  );
}
