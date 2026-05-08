import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/api-helpers';
import { apiError } from '@/lib/api/error-response';

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

export async function GET(request: NextRequest) {
  const authResult = await requireRole('ADMIN');
  if (authResult.response) return authResult.response;

  const { supabase, user } = authResult;
  const url = new URL(request.url);

  const page = Math.max(1, Number.parseInt(url.searchParams.get('page') || '1', 10) || 1);
  const requestedLimit = Number.parseInt(url.searchParams.get('limit') || String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT;
  const limit = Math.min(MAX_LIMIT, Math.max(1, requestedLimit));
  const action = url.searchParams.get('action') || null;
  const actorId = url.searchParams.get('actorId') || null;
  const from = url.searchParams.get('from') || null;
  const to = url.searchParams.get('to') || null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('team_id')
    .eq('id', user!.id)
    .single();

  if (!profile?.team_id) {
    return NextResponse.json(apiError('TEAM_REQUIRED', 'Admin must belong to a team'), { status: 403 });
  }

  let query = supabase
    .from('admin_action_logs')
    .select('*', { count: 'exact' })
    .eq('team_id', profile.team_id)
    .order('created_at', { ascending: false });

  if (action) {
    query = query.eq('action', action);
  }

  if (actorId) {
    query = query.eq('actor_id', actorId);
  }

  if (from) {
    query = query.gte('created_at', from);
  }

  if (to) {
    query = query.lte('created_at', to);
  }

  const offset = (page - 1) * limit;
  const { data, error, count } = await query.range(offset, offset + limit - 1);

  if (error) {
    return NextResponse.json(apiError('FAILED_TO_FETCH_AUDIT_LOGS', 'Failed to fetch audit logs'), { status: 500 });
  }

  return NextResponse.json({
    items: data || [],
    pagination: {
      page,
      limit,
      total: count || 0,
      hasNextPage: offset + limit < (count || 0),
    },
  });
}
