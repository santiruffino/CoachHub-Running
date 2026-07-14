import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { AthletesList } from '@/features/users/components/AthletesList';
import { PageContainer } from '@/components/layout/PageContainer';
import { SupabaseClient } from '@supabase/supabase-js';
import { deriveBillingStatus, getBillingActiveAthleteIds } from '@/lib/billing/athlete-status';

export const dynamic = 'force-dynamic';

interface AthleteProfileResult {
  id: string;
  email: string;
  name: string | null;
  role: string;
  created_at: string;
  coach_id: string | null;
  is_paused_manual: boolean | null;
  paused_at: string | null;
  pause_reason: string | null;
  coach: { id: string; name: string | null } | null;
  athlete_groups: Array<{ id: string; group: { id: string; name: string } | null }>;
}

async function getAthletes(supabase: SupabaseClient, user: { id: string }, profile: { role: string; team_id: string }) {
  // Build query based on role
  let query = supabase
    .from('profiles')
    .select(`
      id,
      email,
      name,
      role,
      created_at,
      coach_id,
      is_paused_manual,
      paused_at,
      pause_reason,
      coach:profiles!coach_id(
        id,
        name
      ),
      athlete_groups(
        id,
        group:groups(
          id,
          name
        )
      )
    `)
    .eq('role', 'ATHLETE');

  // Ensure they only see athletes within their team boundary
  query = query.eq('team_id', profile.team_id);

  // Default to 'mine' scope on initial load for coaches
  // Admins see everyone in the team by default
  if (profile.role === 'COACH') {
    query = query.eq('coach_id', user.id);
  }

  const { data: athletes, error } = await query;

  if (error || !athletes) return [];

  // Get all training assignments for these athletes in a single query
  const athleteIds = (athletes as any as AthleteProfileResult[]).map((a) => a.id);
  const { data: assignments } = await supabase
    .from('training_assignments')
    .select('user_id, completed, scheduled_date')
    .in('user_id', athleteIds);

  // SAN-161: billing status for the roster badges.
  const billingActiveIds = await getBillingActiveAthleteIds(supabase, athleteIds);

  const now = new Date();
  const todayUTC = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`;

  const statsMap = new Map<string, { totalAssignments: number; completedAssignments: number; plannedAssignments: number }>();
  athleteIds.forEach((id: string) => {
    statsMap.set(id, { totalAssignments: 0, completedAssignments: 0, plannedAssignments: 0 });
  });

  (assignments || []).forEach((assignment) => {
    const stats = statsMap.get(assignment.user_id);
    if (!stats) return;
    stats.totalAssignments++;
    if (assignment.completed) {
      stats.completedAssignments++;
    } else {
      const scheduledDateUTC = assignment.scheduled_date.split('T')[0];
      if (scheduledDateUTC >= todayUTC) {
        stats.plannedAssignments++;
      }
    }
  });

  return (athletes as unknown as AthleteProfileResult[]).map((athlete) => {
    const stats = statsMap.get(athlete.id);
    const completionPercentage = stats && stats.totalAssignments > 0
      ? Math.round((stats.completedAssignments / stats.totalAssignments) * 100)
      : 0;

    return {
      ...athlete,
      isPausedManual: Boolean(athlete.is_paused_manual),
      pausedAt: athlete.paused_at ?? null,
      pauseReason: athlete.pause_reason ?? null,
      billingStatus: deriveBillingStatus(athlete.is_paused_manual, billingActiveIds.has(athlete.id)),
      groups: (athlete.athlete_groups || [])
        .map((membership) => (Array.isArray(membership.group) ? membership.group[0] : membership.group))
        .filter(Boolean),
      stats: {
        ...stats,
        completionPercentage,
      },
    };
  });
}

async function getCoaches(supabase: SupabaseClient, profile: { role: string; team_id: string }) {
  if (profile.role !== 'ADMIN') return [];

  const { data: coaches } = await supabase
    .from('profiles')
    .select('id, name, email, created_at')
    .eq('role', 'COACH')
    .eq('team_id', profile.team_id);

  return coaches || [];
}

export default async function AthletesPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, team_id')
    .eq('id', user.id)
    .single();

  if (!profile || (profile.role !== 'COACH' && profile.role !== 'ADMIN')) {
    redirect('/dashboard');
  }

  // Parallel fetch athletes and coaches
  const [athletes, coaches] = await Promise.all([
    getAthletes(supabase, user, profile),
    getCoaches(supabase, profile)
  ]);

  return (
    <PageContainer>
      <AthletesList
        initialAthletes={athletes as any}
        initialCoaches={coaches}
        isAdmin={profile.role === 'ADMIN'}
      />
    </PageContainer>
  );
}
