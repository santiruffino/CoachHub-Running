'use client';
import { appLogger } from '@/lib/app-logger';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { GroupDetails } from '@/interfaces/group';
import { groupsService } from '@/features/groups/services/groups.service';
import { AddMemberModal } from '@/features/groups/components/AddMemberModal';
import { EditGroupModal } from '@/features/groups/components/EditGroupModal';
import { AssignTrainingModal } from '@/features/trainings/components/AssignTrainingModal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import {
  UserPlus,
  Plus,
  ArrowLeft,
  Mail,
  MoreHorizontal,
  Trash2,
  AlertTriangle,
  Settings,
  Calendar,
  Trophy,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTranslations } from 'next-intl';
import api from '@/lib/axios';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { GroupWeeklyCalendar } from '@/features/groups/components/GroupWeeklyCalendar';
import { TrainingAssignment } from '@/interfaces/training';
import { startOfWeek, addDays } from 'date-fns';
import { useLocale } from 'next-intl';

import { GroupAthleteData } from '@/interfaces/athlete';

interface GroupDetailsProps {
    id: string;
    initialGroup: GroupDetails;
    initialAthletes: GroupAthleteData[];
    initialAssignments: TrainingAssignment[];
}

const AVATAR_COLORS = [
  'bg-blue-600',
  'bg-purple-600',
  'bg-pink-600',
  'bg-indigo-600',
  'bg-cyan-600',
  'bg-teal-600',
];

export function GroupDetailsView({ id, initialGroup, initialAthletes, initialAssignments }: GroupDetailsProps) {
  const t = useTranslations();
  const tAthletes = useTranslations('athletes');
  const tGroupDetail = useTranslations('groups.detailPage');
  const tA11y = useTranslations('common.a11y');
  const locale = useLocale();

  const [group, setGroup] = useState<GroupDetails>(initialGroup);
  const [groupAthletes, setGroupAthletes] = useState<GroupAthleteData[]>(initialAthletes);
  const [groupAssignments, setGroupAssignments] = useState<TrainingAssignment[]>(initialAssignments);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);

  const fetchGroupData = useCallback(async () => {
    try {
      const [groupRes, athletesRes, calendarRes] = await Promise.all([
        groupsService.findOne(id),
        api.get('/v2/users/athletes'),
        api.get('/v2/trainings/calendar', {
            params: {
                groupIds: id,
                startDate: startOfWeek(new Date(), { weekStartsOn: 1 }).toISOString(),
                endDate: addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), 28).toISOString(),
            }
        })
      ]);

      const groupData = groupRes.data;
      setGroup(groupData);
      setGroupAssignments(calendarRes.data);

      const groupMemberIds = new Set((groupData.members as Array<{ athlete: { id: string } }>).map((member) => member.athlete.id));

      const filteredAthletes: GroupAthleteData[] = (athletesRes.data as Array<{
        id: string;
        name: string;
        email: string;
        stats?: {
          totalAssignments?: number;
          plannedAssignments?: number;
          completedAssignments?: number;
          completionPercentage?: number;
        };
      }>)
        .filter((athlete) => groupMemberIds.has(athlete.id))
        .map((athlete) => ({
          id: athlete.id,
          name: athlete.name || athlete.email.split('@')[0],
          email: athlete.email,
          sport: tAthletes('sports.running'),
          level: 'Beginner', 
          totalTrainings: athlete.stats?.totalAssignments || 0,
          plannedTrainings: athlete.stats?.plannedAssignments || 0,
          completedTrainings: athlete.stats?.completedAssignments || 0,
          completionPercentage: athlete.stats?.completionPercentage || 0,
        }));

      setGroupAthletes(filteredAthletes);
    } catch (e) {
      appLogger.error(e);
    }
  }, [id, tAthletes]);

  const handleRemoveMember = async (athleteId: string) => {
    if (confirm(t('groups.detail.removeConfirm'))) {
      try {
        await groupsService.removeMember(id, athleteId);
        void fetchGroupData();
      } catch (error) {
        appLogger.error('Failed to remove member', error);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Back Button and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/groups">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1
              className="text-2xl sm:text-3xl font-bold text-endurix-black dark:text-foreground tracking-tight uppercase"
              style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}
            >
              {group.name}
            </h1>
            {group.group_type === 'RACE' && (
              <div className="flex items-center gap-3 mt-1">
                <Badge className="bg-endurix-orange/10 text-endurix-orange border border-endurix-orange/30">
                  <Trophy className="h-3 w-3 mr-1" />
                  {group.race_name}
                </Badge>
                {group.race_date && (
                  <span className="text-xs text-muted-foreground flex items-center">
                    <Calendar className="h-3 w-3 mr-1" />
                    {new Date(group.race_date).toLocaleDateString(locale)}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
        <Button variant="outline-brand" size="sm" onClick={() => setIsEditModalOpen(true)} className="uppercase tracking-widest">
          <Settings className="h-4 w-4 mr-2" />
          {tGroupDetail('editGroup')}
        </Button>
      </div>

      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground">{group.description || t('trainings.assign.noDescription')}</p>
        </CardContent>
      </Card>

      <Tabs defaultValue="members" className="w-full">
        <TabsList className="bg-endurix-black/8 dark:bg-white/8 p-1 mb-6 border border-endurix-black/10 dark:border-border">
          <TabsTrigger
            value="members"
            className="px-8 font-bold uppercase tracking-widest text-[10px] data-[state=active]:bg-white data-[state=active]:text-endurix-black data-[state=active]:dark:bg-card data-[state=active]:dark:text-foreground"
          >
            {t('groups.athletes')}
          </TabsTrigger>
          <TabsTrigger
            value="calendar"
            className="px-8 font-bold uppercase tracking-widest text-[10px] data-[state=active]:bg-white data-[state=active]:text-endurix-black data-[state=active]:dark:bg-card data-[state=active]:dark:text-foreground"
          >
            {t('nav.trainings')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>{t('groups.detail.membersCount', { count: groupAthletes.length })}</CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline-brand" size="sm" onClick={() => setIsAssignModalOpen(true)} className="uppercase tracking-widest text-[10px]">
                    <Plus className="h-4 w-4 mr-2" />
                    {t('groups.detail.assignWorkout')}
                  </Button>
                  <Button variant="orange" size="sm" onClick={() => setIsAddModalOpen(true)} className="uppercase tracking-widest text-[10px]">
                    <UserPlus className="h-4 w-4 mr-2" />
                    {t('groups.detail.addMember')}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0 sm:p-6 sm:pt-0">
              <AssignTrainingModal
                groupId={group.id}
                isOpen={isAssignModalOpen}
                onClose={() => setIsAssignModalOpen(false)}
                onSuccess={fetchGroupData}
              />

              {/* Mobile Cards View */}
              <div className="lg:hidden space-y-3 p-4">
                {groupAthletes.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-4">{t('groups.detail.noMembers')}</p>
                ) : (
                  groupAthletes.map((athlete, idx) => (
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
                              <DropdownMenuItem asChild>
                                <Link href={`/athletes/${athlete.id}`}>
                                  {tAthletes('viewProfile')}
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => handleRemoveMember(athlete.id)}>
                                <Trash2 className="mr-2 h-4 w-4" /> {t('groups.detail.remove')}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        <div className="flex gap-2">
                          <Button asChild variant="outline-brand" size="sm" className="flex-1 uppercase tracking-widest text-[10px]">
                            <Link href={`/athletes/${athlete.id}`}>
                              {tAthletes('viewProfile')}
                            </Link>
                          </Button>
                          <Button asChild variant="orange" size="sm" className="flex-1 uppercase tracking-widest text-[10px]">
                            <Link href={`/workouts/assign?athleteId=${athlete.id}`}>
                              {tAthletes('assignWorkout')}
                            </Link>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>

              {/* Desktop Table View */}
              <div className="hidden lg:block border border-endurix-black/10 dark:border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[280px]">{tAthletes('table.athlete')}</TableHead>
                      <TableHead>{tAthletes('table.sport')}</TableHead>
                      <TableHead>{tAthletes('table.level')}</TableHead>
                      <TableHead className="text-center">{tAthletes('table.trainings')}</TableHead>
                      <TableHead className="text-center">{tAthletes('table.planned')}</TableHead>
                      <TableHead className="w-[150px]">{tAthletes('table.compliance')}</TableHead>
                      <TableHead className="text-right w-[180px]">{tAthletes('table.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {groupAthletes.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                          {t('groups.detail.noMembers')}
                        </TableCell>
                      </TableRow>
                    ) : (
                      groupAthletes.map((athlete, idx) => (
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
                                <Link href={`/athletes/${athlete.id}`}>{tAthletes('viewProfile')}</Link>
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
                                      {tAthletes('assignWorkout')}
                                    </Link>
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => handleRemoveMember(athlete.id)}>
                                    {t('groups.detail.remove')}
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
        </TabsContent>

        <TabsContent value="calendar" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>{tGroupDetail('groupPlanning')}</CardTitle>
                <Button variant="orange" size="sm" onClick={() => setIsAssignModalOpen(true)} className="uppercase tracking-widest text-[10px]">
                  <Plus className="h-4 w-4 mr-2" />
                  {tGroupDetail('scheduleTraining')}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <GroupWeeklyCalendar groupId={group.id} assignments={groupAssignments} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <AddMemberModal
        groupId={group.id}
        currentMemberIds={groupAthletes.map((a) => a.id)}
        open={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdded={fetchGroupData}
      />

      <EditGroupModal
        group={group}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onUpdated={fetchGroupData}
      />
    </div>
  );
}
