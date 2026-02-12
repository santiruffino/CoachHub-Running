'use client';

import { useEffect, useState } from 'react';
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
import { Search, UserPlus, AlertTriangle, Mail, Phone } from 'lucide-react';
import api from '@/lib/axios';
import { InviteAthleteModal } from '@/features/invitations/components/InviteAthleteModal';


interface AthleteData {
  id: string;
  name: string;
  email: string;
  sport: string;
  level: string;
  groups: { id: string; name: string }[];
  totalTrainings: number;
  plannedTrainings: number;
  completedTrainings: number;
  completionPercentage: number;
  phone?: string;
}

const AVATAR_COLORS = [
  'bg-blue-600',
  'bg-purple-600',
  'bg-pink-600',
  'bg-indigo-600',
  'bg-cyan-600',
  'bg-teal-600',
];

function determineLevel(completedTrainings: number): string {
  if (completedTrainings >= 50) return 'Elite';
  if (completedTrainings >= 30) return 'Avanzado';
  if (completedTrainings >= 10) return 'Intermedio';
  return 'Principiante';
}

export default function AthletesPage() {
  const [athletes, setAthletes] = useState<AthleteData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [inviteModalOpen, setInviteModalOpen] = useState(false);


  useEffect(() => {
    const fetchAthletes = async () => {
      try {
        setLoading(true);

        // Fetch athletes with stats - single API call
        const athletesRes = await api.get('/v2/users/athletes');
        const athletesList = athletesRes.data;
        console.log(athletesList)

        // Map API response to AthleteData interface
        const athletesData: AthleteData[] = athletesList.map((athlete: any) => ({
          id: athlete.id,
          name: athlete.name || athlete.email.split('@')[0],
          email: athlete.email,
          sport: 'Running',
          level: determineLevel(athlete.stats.completedAssignments),
          groups: athlete.groups || [],
          totalTrainings: athlete.stats.totalAssignments,
          plannedTrainings: athlete.stats.plannedAssignments,
          completedTrainings: athlete.stats.completedAssignments,
          completionPercentage: athlete.stats.completionPercentage,
        }));

        setAthletes(athletesData);
      } catch (error) {
        console.error('Failed to fetch athletes', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAthletes();
  }, []);

  const filteredAthletes = athletes.filter(
    (athlete) =>
      athlete.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      athlete.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      athlete.sport.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          <h1 className="text-2xl sm:text-3xl font-bold">Atletas</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Gestiona tu roster de atletas
          </p>
        </div>
        <Button onClick={() => setInviteModalOpen(true)} size="sm" className="sm:size-default">
          <UserPlus className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">Añadir Atleta</span>
        </Button>
      </div>

      {/* Invite Modal */}
      <InviteAthleteModal
        open={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
      />



      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar atletas por nombre o deporte..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Mobile Cards View */}
      <div className="lg:hidden space-y-3">
        {filteredAthletes.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No se encontraron atletas
            </CardContent>
          </Card>
        ) : (
          filteredAthletes.map((athlete, idx) => (
            <Card key={athlete.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
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
                <div className="flex gap-2">
                  <Button asChild variant="outline" size="sm" className="flex-1">
                    <Link href={`/athletes/${athlete.id}`}>
                      Ver Perfil
                    </Link>
                  </Button>
                  <Button asChild size="sm" className="flex-1">
                    <Link href={`/workouts/assign?athleteId=${athlete.id}`}>
                      Asignar Entreno
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
                  <TableHead className="w-[280px]">Atleta</TableHead>
                  <TableHead>Deporte</TableHead>
                  <TableHead>Nivel</TableHead>
                  <TableHead>Grupos</TableHead>
                  <TableHead className="text-center">Entrenamientos</TableHead>
                  <TableHead className="text-center">Planificados</TableHead>
                  <TableHead className="w-[150px]">Cumplimiento</TableHead>
                  <TableHead className="text-right w-[220px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAthletes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                      No se encontraron atletas
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAthletes.map((athlete, idx) => (
                    <TableRow key={athlete.id}>
                      {/* Athlete Info */}
                      <TableCell>
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
                      </TableCell>

                      {/* Sport */}
                      <TableCell>
                        <Badge variant="outline">{athlete.sport}</Badge>
                      </TableCell>

                      {/* Level */}
                      <TableCell>
                        <span className="text-sm font-medium">{athlete.level}</span>
                      </TableCell>

                      {/* Groups */}
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {athlete.groups.length > 0 ? (
                            athlete.groups.slice(0, 2).map((group) => (
                              <Badge key={group.id} variant="secondary" className="text-xs">
                                {group.name}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                          {athlete.groups.length > 2 && (
                            <Badge variant="secondary" className="text-xs">
                              +{athlete.groups.length - 2}
                            </Badge>
                          )}
                        </div>
                      </TableCell>

                      {/* Total Trainings */}
                      <TableCell className="text-center">
                        <span className="font-medium">{athlete.totalTrainings}</span>
                      </TableCell>

                      {/* Planned Trainings with Warning */}
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <span className="font-medium">{athlete.plannedTrainings}</span>
                          {athlete.plannedTrainings < 3 && (
                            <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0" />
                          )}
                        </div>
                      </TableCell>

                      {/* Completion Progress */}
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium text-xs">{athlete.completionPercentage}%</span>
                          </div>
                          <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gray-900 transition-all rounded-full"
                              style={{ width: `${athlete.completionPercentage}%` }}
                            />
                          </div>
                        </div>
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button asChild variant="outline" size="sm">
                            <Link href={`/athletes/${athlete.id}`}>
                              Ver Perfil
                            </Link>
                          </Button>
                          <Button asChild size="sm">
                            <Link href={`/workouts/assign?athleteId=${athlete.id}`}>
                              Asignar Entreno
                            </Link>
                          </Button>
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
