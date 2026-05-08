import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { apiError } from '@/lib/api/error-response';
import { appendAdminActionLog } from '@/lib/audit/admin-action-log';

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(apiError('AUTH_UNAUTHORIZED', 'Unauthorized'),
        { status: 401 }
      );
    }

    // Check if user is a coach or admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, team_id')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'COACH' && profile?.role !== 'ADMIN') {
      return NextResponse.json(apiError('AUTH_FORBIDDEN', 'Only coaches or admins can access this endpoint'),
        { status: 403 }
      );
    }

    // Get all groups for this coach or team
    let groupsQuery = supabase
      .from('groups')
      .select(`
        *,
        race:races(*),
        _count:athlete_groups(count)
      `)
      .order('created_at', { ascending: false });

    if (profile.role === 'ADMIN' || profile.role === 'COACH') {
      groupsQuery = groupsQuery.eq('team_id', profile.team_id);
    }

    const { data: groups, error } = await groupsQuery;

    if (error) {
      return NextResponse.json(apiError('FAILED_TO_FETCH_GROUPS', 'Failed to fetch groups'),
        { status: 500 }
      );
    }

    return NextResponse.json(groups);
  } catch {
    return NextResponse.json(apiError('INTERNAL_SERVER_ERROR', 'Internal server error'),
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(apiError('AUTH_UNAUTHORIZED', 'Unauthorized'),
        { status: 401 }
      );
    }

    // Check if user is a coach or admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, team_id')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'COACH' && profile?.role !== 'ADMIN') {
      return NextResponse.json(apiError('AUTH_FORBIDDEN', 'Only coaches or admins can create groups'),
        { status: 403 }
      );
    }

    const body = await request.json();
    const { 
      name, 
      description, 
      group_type, 
      race_id,
      race_name, 
      race_date, 
      race_distance, 
      race_priority 
    } = body;

    if (!name) {
      return NextResponse.json(apiError('VALIDATION_GROUP_NAME_IS_REQUIRED', 'Group name is required'),
        { status: 400 }
      );
    }

    const { data: group, error } = await supabase
      .from('groups')
      .insert({
        name,
        description,
        group_type: group_type || 'REGULAR',
        race_id: race_id || null,
        race_name: race_name || null,
        race_date: race_date || null,
        race_distance: race_distance || null,
        race_priority: race_priority || null,
        created_by: user.id,
        team_id: profile.team_id,
      })
      .select(`
        *,
        race:races(*)
      `)
      .single();

    if (error) {
      return NextResponse.json(apiError('FAILED_TO_CREATE_GROUP', 'Failed to create group'),
        { status: 500 }
      );
    }

    if (profile.role === 'ADMIN') {
      await appendAdminActionLog({
        actorId: user.id,
        actorRole: 'ADMIN',
        teamId: profile.team_id,
        action: 'group.created',
        targetType: 'group',
        targetId: group.id,
        metadata: {
          groupType: group.group_type,
          hasRace: !!group.race_id,
        },
      });
    }

    return NextResponse.json(group, { status: 201 });
  } catch {
    return NextResponse.json(apiError('INTERNAL_SERVER_ERROR', 'Internal server error'),
      { status: 500 }
    );
  }
}
