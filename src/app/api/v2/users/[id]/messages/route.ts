import { NextRequest, NextResponse } from 'next/server';
import { createRequestLogger, withRequestId } from '@/lib/logger';
import { requireAuth } from '@/lib/supabase/api-helpers';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { apiError } from '@/lib/api/error-response';
import { createNotification } from '@/lib/notifications/create-notification';
import * as Sentry from '@sentry/nextjs';

interface MessageRequestBody {
    body?: string;
}

interface ProfileRecord {
    id: string;
    role: 'COACH' | 'ATHLETE' | 'ADMIN';
    team_id: string | null;
    coach_id: string | null;
    name: string | null;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
}

interface MessageRecord {
    id: string;
    athlete_id: string;
    coach_id: string;
    sender_id: string;
    body: string;
    read_at: string | null;
    created_at: string;
}

function formatDisplayName(profile?: Pick<ProfileRecord, 'name' | 'first_name' | 'last_name' | 'email'> | null) {
    if (!profile) return 'Usuario';

    if (profile.name && profile.name.trim()) {
        return profile.name.trim();
    }

    const fullName = [profile.first_name, profile.last_name].filter(Boolean).join(' ').trim();
    if (fullName) {
        return fullName;
    }

    if (profile.email) {
        return profile.email.split('@')[0];
    }

    return 'Usuario';
}

async function resolveThreadContext(serviceSupabase: ReturnType<typeof createServiceRoleClient>, currentUserId: string, athleteId: string) {
    const profileSelect = 'id, role, team_id, coach_id, name, first_name, last_name, email';

    const [{ data: currentUserProfile, error: currentUserError }, { data: athleteProfile, error: athleteError }] = await Promise.all([
        serviceSupabase.from('profiles').select(profileSelect).eq('id', currentUserId).single(),
        serviceSupabase.from('profiles').select(profileSelect).eq('id', athleteId).eq('role', 'ATHLETE').single(),
    ]);

    if (currentUserError || !currentUserProfile) {
        return { error: apiError('CHAT_THREAD_ACCESS_DENIED', 'Unable to resolve current user profile'), status: 403 as const };
    }

    if (currentUserProfile.role !== 'COACH' && currentUserProfile.role !== 'ADMIN' && currentUserProfile.role !== 'ATHLETE') {
        return { error: apiError('CHAT_THREAD_ACCESS_DENIED', 'Chat is only available for coaches and athletes'), status: 403 as const };
    }

    if (athleteError || !athleteProfile) {
        return { error: apiError('CHAT_THREAD_NOT_FOUND', 'Athlete not found'), status: 404 as const };
    }

    if (!athleteProfile.coach_id) {
        return { error: apiError('CHAT_THREAD_NOT_AVAILABLE', 'This athlete does not have a coach assigned yet'), status: 404 as const };
    }

    if (currentUserProfile.role === 'ATHLETE' && currentUserProfile.id !== athleteProfile.id) {
        return { error: apiError('CHAT_THREAD_ACCESS_DENIED', 'You can only access your own chat thread'), status: 403 as const };
    }

    const coachProfileId = athleteProfile.coach_id;
    const { data: coachProfile, error: coachError } = await serviceSupabase
        .from('profiles')
        .select(profileSelect)
        .eq('id', coachProfileId)
        .eq('role', 'COACH')
        .single();

    if (coachError || !coachProfile) {
        return { error: apiError('CHAT_THREAD_NOT_AVAILABLE', 'This athlete does not have an assigned coach thread'), status: 404 as const };
    }

    return {
        currentUserProfile,
        athleteProfile,
        coachProfile,
        error: null,
        status: 200 as const,
    };
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { requestId, logger } = createRequestLogger('/api/v2/users/[id]/messages', request);
    const respond = (body: unknown, init?: ResponseInit) => NextResponse.json(body, withRequestId(init, requestId));

    try {
        const authResult = await requireAuth();

        if (authResult.response) {
            authResult.response.headers.set('x-request-id', requestId);
            return authResult.response;
        }

        const { user } = authResult;
        const serviceSupabase = createServiceRoleClient();
        const { id: athleteId } = await params;

        const context = await resolveThreadContext(serviceSupabase, user!.id, athleteId);

        if (context.error) {
            return respond(context.error, { status: context.status });
        }

        const { currentUserProfile, athleteProfile, coachProfile } = context;
        const threadCoachId = coachProfile.id;

        const { data: messagesData, error: messagesError } = await serviceSupabase
            .from('coach_athlete_messages')
            .select('id, athlete_id, coach_id, sender_id, body, read_at, created_at')
            .eq('athlete_id', athleteProfile.id)
            .eq('coach_id', threadCoachId)
            .order('created_at', { ascending: true })
            ;

        if (messagesError) {
            logger.error('chat.thread_load_failed', { error: messagesError, athleteId: athleteProfile.id, coachId: threadCoachId });
            return respond(apiError('CHAT_THREAD_LOAD_FAILED', 'Failed to load chat thread'), { status: 500 });
        }

        const messageRows = messagesData || [];
        const unreadSenderIds = Array.from(new Set(messageRows.filter((message) => message.sender_id !== currentUserProfile.id && !message.read_at).map((message) => message.sender_id)));

        if (unreadSenderIds.length > 0) {
            const { error: markReadError } = await serviceSupabase
                .from('coach_athlete_messages')
                .update({ read_at: new Date().toISOString() })
                .eq('athlete_id', athleteProfile.id)
                .eq('coach_id', threadCoachId)
                .neq('sender_id', currentUserProfile.id)
                .is('read_at', null);

            if (markReadError) {
                logger.warn('chat.thread_mark_read_failed', { error: markReadError, athleteId: athleteProfile.id, coachId: threadCoachId });
            }
        }

        const senderIds = Array.from(new Set(messageRows.map((message) => message.sender_id)));
        let senderProfiles: Array<Pick<ProfileRecord, 'id' | 'name' | 'first_name' | 'last_name' | 'email'>> = [];

        if (senderIds.length > 0) {
            const { data: senderData, error: senderError } = await serviceSupabase
                .from('profiles')
                .select('id, name, first_name, last_name, email')
                .in('id', senderIds);

            if (senderError) {
                logger.error('chat.thread_sender_lookup_failed', { error: senderError, athleteId: athleteProfile.id, coachId: threadCoachId });
                return respond(apiError('CHAT_THREAD_LOAD_FAILED', 'Failed to load chat thread'), { status: 500 });
            }

            senderProfiles = (senderData || []) as Array<Pick<ProfileRecord, 'id' | 'name' | 'first_name' | 'last_name' | 'email'>>;
        }

        const senderMap = new Map(senderProfiles.map((profile) => [profile.id, formatDisplayName(profile)]));

        return respond({
            currentUserId: currentUserProfile.id,
            athlete: {
                id: athleteProfile.id,
                name: formatDisplayName(athleteProfile),
                email: athleteProfile.email,
            },
            coach: {
                id: threadCoachId,
                name: formatDisplayName(coachProfile),
                email: coachProfile.email,
            },
            messages: messageRows.map((message) => ({
                id: message.id,
                athleteId: message.athlete_id,
                coachId: message.coach_id,
                senderId: message.sender_id,
                senderName: senderMap.get(message.sender_id) || formatDisplayName(message.sender_id === coachProfile.id ? coachProfile : athleteProfile),
                body: message.body,
                readAt: message.read_at,
                createdAt: message.created_at,
            })),
        });
    } catch (error: unknown) {
        logger.error('chat.thread_unhandled_error', { error });
        Sentry.captureException(error, { tags: { route: '/api/v2/users/[id]/messages', requestId } });
        return respond(apiError('INTERNAL_SERVER_ERROR'), { status: 500 });
    }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { requestId, logger } = createRequestLogger('/api/v2/users/[id]/messages', request);
    const respond = (body: unknown, init?: ResponseInit) => NextResponse.json(body, withRequestId(init, requestId));

    try {
        const authResult = await requireAuth();

        if (authResult.response) {
            authResult.response.headers.set('x-request-id', requestId);
            return authResult.response;
        }

        const { user } = authResult;
        const serviceSupabase = createServiceRoleClient();
        const { id: athleteId } = await params;
        const payload = (await request.json()) as MessageRequestBody;
        const body = typeof payload.body === 'string' ? payload.body.trim() : '';

        if (!body) {
            return respond(apiError('VALIDATION_MESSAGE_REQUIRED', 'Message body is required'), { status: 400 });
        }

        if (body.length > 2000) {
            return respond(apiError('VALIDATION_MESSAGE_TOO_LONG', 'Message body must be 2000 characters or less'), { status: 400 });
        }

        const context = await resolveThreadContext(serviceSupabase, user!.id, athleteId);

        if (context.error) {
            return respond(context.error, { status: context.status });
        }

        const { currentUserProfile, athleteProfile, coachProfile } = context;
        const threadCoachId = coachProfile.id;

        const { data: insertedMessage, error: insertError } = await serviceSupabase
            .from('coach_athlete_messages')
            .insert({
                athlete_id: athleteProfile.id,
                coach_id: threadCoachId,
                sender_id: currentUserProfile.id,
                body,
            })
            .select('id, athlete_id, coach_id, sender_id, body, read_at, created_at')
            .single<MessageRecord>();

        if (insertError || !insertedMessage) {
            logger.error('chat.thread_send_failed', { error: insertError, athleteId: athleteProfile.id, coachId: threadCoachId });
            return respond(apiError('CHAT_MESSAGE_SEND_FAILED', 'Failed to send message'), { status: 500 });
        }

        const recipientId = currentUserProfile.id === athleteProfile.id ? threadCoachId : athleteProfile.id;
        const senderName = formatDisplayName(currentUserProfile);
        await createNotification({
            userId: recipientId,
            category: 'chat_message',
            title: senderName,
            body: body.length > 140 ? `${body.slice(0, 140)}…` : body,
            link: `/athletes/${athleteProfile.id}`,
        });

        return respond({
            success: true,
            message: {
                id: insertedMessage.id,
                athleteId: insertedMessage.athlete_id,
                coachId: insertedMessage.coach_id,
                senderId: insertedMessage.sender_id,
                senderName: formatDisplayName(currentUserProfile),
                body: insertedMessage.body,
                readAt: insertedMessage.read_at,
                createdAt: insertedMessage.created_at,
            },
        }, { status: 201 });
    } catch (error: unknown) {
        logger.error('chat.thread_unhandled_error', { error });
        Sentry.captureException(error, { tags: { route: '/api/v2/users/[id]/messages', requestId } });
        return respond(apiError('INTERNAL_SERVER_ERROR'), { status: 500 });
    }
}
