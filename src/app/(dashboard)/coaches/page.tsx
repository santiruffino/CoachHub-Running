'use client';

import { useEffect, useState } from 'react';
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
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Mail, Users, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertDialog } from '@/components/ui/AlertDialog';
import api from '@/lib/axios';
import { useTranslations } from 'next-intl';

import { CoachData } from '@/interfaces/coach';

import { InviteCoachModal } from '@/features/invitations/components/InviteCoachModal';

const AVATAR_COLORS = [
  'bg-blue-600',
  'bg-purple-600',
  'bg-pink-600',
  'bg-indigo-600',
  'bg-cyan-600',
  'bg-teal-600',
];

export default function CoachesPage() {
  const [coaches, setCoaches] = useState<CoachData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const t = useTranslations();
  
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

  const fetchCoaches = async () => {
    try {
      setLoading(true);
      const res = await api.get('/v2/users/coaches');
      setCoaches(res.data);
    } catch (error) {
      console.error('Failed to fetch coaches', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoaches();
  }, []);

  const handleDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      // Deleting a coach reassigns their athletes to the current Admin
      await api.delete(`/v2/users/coaches/${deleteId}`);
      // Optimistically update the UI instead of re-fetching
      setCoaches(prev => prev.filter(c => c.id !== deleteId));
      setDeleteId(null);
    } catch (error) {
      console.error('Failed to delete coach', error);
      alert(t('coaches.deleteFailed'));
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredCoaches = coaches.filter(
    (c) =>
      c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="p-8 space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl sm:text-3xl font-bold font-display tracking-tight text-foreground">{t('coaches.title')}</h1>
        <Button onClick={() => setIsInviteModalOpen(true)}>
            Invitar Coach
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t('coaches.searchPlaceholder')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      <AlertDialog 
        open={!!deleteId} 
        onClose={() => { if (!isDeleting) setDeleteId(null); }}
        onConfirm={handleDelete}
        type="warning"
        title={t('coaches.deleteTitle')}
        message={t('coaches.deleteMessage')}
        confirmText={t('coaches.deleteConfirm')}
        loading={isDeleting}
      />

      <Card>
        <CardContent className="p-0">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[300px]">{t('coaches.table.coach')}</TableHead>
                  <TableHead className="text-center">{t('coaches.table.athletes')}</TableHead>
                  <TableHead className="text-right">{t('coaches.table.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCoaches.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-12 text-muted-foreground">
                      {t('coaches.table.noCoaches')}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCoaches.map((coach, idx) => (
                    <TableRow key={coach.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className={`h-10 w-10 ${AVATAR_COLORS[idx % AVATAR_COLORS.length]}`}>
                            <AvatarFallback className="bg-transparent text-white font-semibold">
                              {coach.name ? coach.name.charAt(0).toUpperCase() : 'C'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-medium truncate">{coach.name || t('coaches.table.noName')}</p>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                              <Mail className="h-3 w-3 flex-shrink-0" />
                              <span className="truncate">{coach.email}</span>
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2 font-medium">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          {coach.totalAthletes}
                        </div>
                      </TableCell>

                      <TableCell className="text-right">
                         <Button variant="ghost" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => setDeleteId(coach.id)}>
                            <Trash2 className="h-4 w-4 mr-2" />
                            {t('coaches.deleteButton')}
                         </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <InviteCoachModal 
        open={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
      />
    </div>
  );
}
