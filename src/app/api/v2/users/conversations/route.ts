import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase/api-helpers';
import { createServiceRoleClient } from '@/lib/supabase/server';
import * as Sentry from '@sentry/nextjs';
import { createRequestLogger, withRequestId } from '@/lib/logger';
import { apiError } from '@/lib/api/error-response';

interface ProfileNameRow {
  id: string;
  name: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
}

interface MessageRow {
  athlete_id: string;
  coach_id: string;
  sender_id: string;
  body: string;
  read_at: string | null;
  created_at: string;
}

function formatDisplayName(profile?: Pick<ProfileNameRow, 'name' | 'first_name' | 'last_name' | 'email'> | null) {
  if (!profile) return 'Usuario';
  if (profile.name && profile.name.trim()) return profile.name.trim();
  const fullName = [profile.first_name, profile.last_name].filter(Boolean).join(' ').trim();
  if (fullName) return fullName;
  if (profile.email) return profile.email.split('@')[0];
  return 'Usuario';
}

export async function GET(request: NextRequest) {
  const { requestId, logger } = createRequestLogger('/api/v2/users/conversations', request);
  const respond = (body: unknown, init?: ResponseInit) =>
    NextResponse.json(body, withRequestId(init, requestId));

  try {
    const authResult = await requireAuth();
    if (authResult.response) {
      authResult.response.headers.set('x-request-id', requestId);
      return authResult.response;
    }

    const { user } = authResult;
    const serviceSupabase = createServiceRoleClient();

    const { data: currentProfile } = await serviceSupabase
      .from('profiles')
      .select('id, role, name, first_name, last_name, email')
      .eq('id', user!.id)
      .single();

    if (!currentProfile) {
      return respond(apiError('AUTH_FORBIDDEN'), { status: 403 });
    }

    let athleteIds: string[] = [];
    let athleteProfiles: ProfileNameRow[] = [];
    let coachId: string;
    let coachProfile: ProfileNameRow | null = null;

    if (currentProfile.role === 'COACH' || currentProfile.role === 'ADMIN') {
      coachId = currentProfile.id;
      coachProfile = currentProfile;

      const { data: athletes } = await serviceSupabase
        .from('profiles')
        .select('id, name, first_name, last_name, email')
        .eq('role', 'ATHLETE')
        .eq('coach_id', currentProfile.id);

      athleteProfiles = athletes || [];
      athleteIds = athleteProfiles.map((a) => a.id);
    } else {
      const { data: selfProfile } = await serviceSupabase
        .from('profiles')
        .select('id, coach_id, name, first_name, last_name, email')
        .eq('id', currentProfile.id)
        .single();

      if (!selfProfile?.coach_id) {
        return respond({ conversations: [] }, { status: 200 });
      }

      coachId = selfProfile.coach_id;
      athleteProfiles = [selfProfile];
      athleteIds = [selfProfile.id];

      const { data: coachRow } = await serviceSupabase
        .from('profiles')
        .select('id, name, first_name, last_name, email')
        .eq('id', coachId)
        .single();

      coachProfile = coachRow || null;
    }

    if (athleteIds.length === 0) {
      return respond({ conversations: [] }, { status: 200 });
    }

    const { data: messageRows, error: messagesError } = await serviceSupabase
      .from('coach_athlete_messages')
      .select('athlete_id, coach_id, sender_id, body, read_at, created_at')
      .eq('coach_id', coachId)
      .in('athlete_id', athleteIds)
      .order('created_at', { ascending: false });

    if (messagesError) {
      logger.error('chat.conversations_load_failed', { error: messagesError, userId: currentProfile.id });
      return respond(apiError('CHAT_CONVERSATIONS_LOAD_FAILED', 'Failed to load conversations'), { status: 500 });
    }

    const rows = (messageRows || []) as MessageRow[];
    const lastMessageByAthlete = new Map<string, MessageRow>();
    const unreadCountByAthlete = new Map<string, number>();

    for (const row of rows) {
      if (!lastMessageByAthlete.has(row.athlete_id)) {
        lastMessageByAthlete.set(row.athlete_id, row);
      }
      if (row.sender_id !== currentProfile.id && !row.read_at) {
        unreadCountByAthlete.set(row.athlete_id, (unreadCountByAthlete.get(row.athlete_id) || 0) + 1);
      }
    }

    const conversations = athleteProfiles
      .map((athlete) => {
        const lastMessage = lastMessageByAthlete.get(athlete.id) || null;
        return {
          athleteId: athlete.id,
          athleteName: formatDisplayName(athlete),
          coachId,
          coachName: formatDisplayName(coachProfile),
          lastMessage: lastMessage
            ? {
                body: lastMessage.body,
                senderId: lastMessage.sender_id,
                createdAt: lastMessage.created_at,
              }
            : null,
          unreadCount: unreadCountByAthlete.get(athlete.id) || 0,
        };
      })
      .sort((a, b) => {
        const aTime = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0;
        const bTime = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0;
        return bTime - aTime;
      });

    return respond({ conversations }, { status: 200 });
  } catch (error: unknown) {
    logger.error('chat.conversations_unhandled_error', { error });
    Sentry.captureException(error, { tags: { route: '/api/v2/users/conversations', requestId } });
    return respond(apiError('INTERNAL_SERVER_ERROR'), { status: 500 });
  }
}
