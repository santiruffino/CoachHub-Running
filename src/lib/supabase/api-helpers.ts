import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

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

export async function requireRole(role: 'COACH' | 'ATHLETE') {
  const authResult = await requireAuth();
  
  if (authResult.response) {
    return authResult;
  }

  const { data: profile } = await authResult.supabase
    .from('profiles')
    .select('role')
    .eq('id', authResult.user!.id)
    .single();

  if (profile?.role !== role) {
    return {
      user: null,
      supabase: authResult.supabase,
      response: NextResponse.json(
        { error: `Only ${role.toLowerCase()}s can access this endpoint` },
        { status: 403 }
      ),
    };
  }

  return { user: authResult.user, supabase: authResult.supabase, response: null };
}

