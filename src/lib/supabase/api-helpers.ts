import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export type AppRole = 'COACH' | 'ATHLETE' | 'ADMIN';

export interface RequesterProfile {
  id: string;
  role: AppRole;
  team_id: string | null;
}

export async function getAuthenticatedUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { user: null, error: 'Unauthorized', supabase };
  }

  return { user, error: null, supabase };
}

export async function requireAuth() {
  const { user, error, supabase } = await getAuthenticatedUser();
  
  if (error || !user) {
    return {
      user: null,
      supabase,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  return { user, supabase, response: null };
}

export async function requireRole(role: 'COACH' | 'ATHLETE' | 'ADMIN' | ('COACH' | 'ATHLETE' | 'ADMIN')[]) {
  const authResult = await requireAuth();
  
  if (authResult.response) {
    return authResult;
  }

  const { data: profile } = await authResult.supabase
    .from('profiles')
    .select('role')
    .eq('id', authResult.user!.id)
    .single();

  const allowedRoles = Array.isArray(role) ? role : [role];

  const profileRole = profile?.role as AppRole | undefined;

  // Admins have access to everything to act as "Super Coaches"
  const isAllowed = profileRole === 'ADMIN' || (profileRole ? allowedRoles.includes(profileRole) : false);

  if (!isAllowed) {
    const roleString = Array.isArray(role) ? role.join(' or ').toLowerCase() : role.toLowerCase();
    return {
      user: null,
      supabase: authResult.supabase,
      response: NextResponse.json(
        { error: `Only ${roleString}s can access this endpoint` },
        { status: 403 }
      ),
    };
  }

  return { user: authResult.user, supabase: authResult.supabase, response: null };
}

export async function getRequesterProfile(userId: string) {
  const supabase = await createClient();
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, role, team_id')
    .eq('id', userId)
    .single();

  if (error || !profile) {
    return { profile: null, error: 'Profile not found' } as const;
  }

  return {
    profile: {
      id: profile.id,
      role: profile.role as AppRole,
      team_id: profile.team_id,
    } as RequesterProfile,
    error: null,
  } as const;
}
