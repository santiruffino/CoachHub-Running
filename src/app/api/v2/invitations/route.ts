import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/api-helpers';
import { randomBytes } from 'crypto';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { createRequestLogger } from '@/lib/logger';
import { sendInvitationEmail } from '@/lib/email/send';
import { reportApiError } from '@/lib/api/report-error';

export async function POST(request: NextRequest) {
    const { requestId, logger } = createRequestLogger('/api/v2/invitations', request);
    try {
        // Only coaches can create invitations
        const { user, profile, response } = await requireRole('COACH');

        if (response) {
            return response;
        }

        const { email, role = 'ATHLETE' } = await request.json();

        if (!email) {
            return NextResponse.json(
                { error: 'Email is required' },
                { status: 400 }
            );
        }

        if (role !== 'ATHLETE' && role !== 'COACH') {
            return NextResponse.json(
                { error: 'Invalid role specified. Must be ATHLETE or COACH.' },
                { status: 400 }
            );
        }

        const adminClient = createServiceRoleClient();

        if (!profile?.team_id) {
            return NextResponse.json(
                { error: 'You must belong to a running team to invite users.' },
                { status: 400 }
            );
        }

        // Check team athlete limit (if set)
        if (role === 'ATHLETE') {
            const { data: teamSettings } = await adminClient
                .from('team_settings')
                .select('max_athletes')
                .eq('team_id', profile.team_id)
                .maybeSingle();

            if (teamSettings && teamSettings.max_athletes !== null && teamSettings.max_athletes > 0) {
                const { count: currentAthletes } = await adminClient
                    .from('profiles')
                    .select('*', { count: 'exact', head: true })
                    .eq('team_id', profile.team_id)
                    .eq('role', 'ATHLETE');

                if (currentAthletes !== null && currentAthletes >= teamSettings.max_athletes) {
                    return NextResponse.json(
                        { error: `El equipo ha alcanzado el límite de ${teamSettings.max_athletes} atletas. Actualiza el plan para añadir más.` },
                        { status: 403 }
                    );
                }
            }
        }

        if (role === 'COACH' && profile.role !== 'ADMIN') {
            return NextResponse.json(
                { error: 'Only administrators can invite other coaches.' },
                { status: 403 }
            );
        }

        // Check if user already exists
        const { data: existingProfile } = await adminClient
            .from('profiles')
            .select('email')
            .eq('email', email)
            .single();

        if (existingProfile) {
            return NextResponse.json(
                { error: 'User with this email already exists' },
                { status: 400 }
            );
        }

        // Check if there's already a pending invite link for this email
        const { data: existingInvitation } = await adminClient
            .from('team_invite_links')
            .select('*')
            .eq('email', email)
            .eq('is_active', true)
            .gte('expires_at', new Date().toISOString())
            .maybeSingle();

        if (existingInvitation) {
            // Fetch team name and inviter profile for the email
            const [{ data: team }, { data: inviterProfile }] = await Promise.all([
                adminClient.from('teams').select('name').eq('id', profile.team_id).single(),
                adminClient.from('profiles').select('name, email').eq('id', user!.id).single(),
            ]);

            // Resend invitation email before returning
            await sendInvitationEmail({
                to: email,
                inviterName: inviterProfile?.name || inviterProfile?.email || 'your coach',
                teamName: team?.name || 'your team',
                role: existingInvitation.role || 'ATHLETE',
                token: existingInvitation.token,
                expiresAt: new Date(existingInvitation.expires_at),
            }).catch((err) => {
                reportApiError(err, { route: '/api/v2/invitations', method: 'POST', extra: { event: 'invitations.resend_email_failed' } });
            });

            // Return existing invitation
            return NextResponse.json({
                id: existingInvitation.id,
                email: existingInvitation.email,
                token: existingInvitation.token,
                expiresAt: existingInvitation.expires_at,
                accepted: existingInvitation.uses > 0,
                role: existingInvitation.role,
            });
        }

        // Generate unique token
        const token = randomBytes(32).toString('hex');

        // Set expiration to 7 days from now
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        // Determine if we should hard-assign a coach. If SUPER COACH (ADMIN), we assign to team but no specific coach by default.
        // If the invited user is a COACH, they don't get a coach.
        const coachIdToAssign = (profile.role === 'ADMIN' || role === 'COACH') ? null : user!.id;

        // Create a single-use, email-targeted team invite link (SAN-59: this
        // is the same table generic "join team" links use, just scoped to one
        // recipient via the `email` column).
        const { data: invitation, error } = await adminClient
            .from('team_invite_links')
            .insert({
                team_id: profile.team_id,
                created_by: user!.id,
                role,
                token,
                email,
                coach_id: coachIdToAssign,
                is_active: true,
                expires_at: expiresAt.toISOString(),
                max_uses: 1,
                uses: 0,
            })
            .select()
            .single();

        if (error) {
            logger.error('Error creating invitation', { error: error });
            return NextResponse.json(
                { error: 'Failed to create invitation' },
                { status: 500 }
            );
        }

        // Fetch team name and inviter profile for the email
        const [{ data: team }, { data: inviterProfile }] = await Promise.all([
            adminClient.from('teams').select('name').eq('id', profile.team_id).single(),
            adminClient.from('profiles').select('name, email').eq('id', user!.id).single(),
        ]);

        // Send invitation email before returning
        await sendInvitationEmail({
            to: email,
            inviterName: inviterProfile?.name || inviterProfile?.email || 'your coach',
            teamName: team?.name || 'your team',
            role,
            token: invitation.token,
            expiresAt,
        }).catch((err) => {
            reportApiError(err, { route: '/api/v2/invitations', method: 'POST', extra: { event: 'invitations.send_email_failed' } });
        });

        return NextResponse.json({
            id: invitation.id,
            email: invitation.email,
            token: invitation.token,
            expiresAt: invitation.expires_at,
            accepted: invitation.uses > 0,
        });
    } catch (error: unknown) {
        reportApiError(error, { route: '/api/v2/invitations', method: 'POST', requestId, logger });
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
