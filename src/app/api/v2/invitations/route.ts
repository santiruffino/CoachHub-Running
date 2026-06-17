import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/api-helpers';
import { randomBytes } from 'crypto';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { appLogger } from '@/lib/app-logger';
import { sendInvitationEmail } from '@/lib/email/send';

export async function POST(request: NextRequest) {
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

        // Check if there's already a pending invitation
        const { data: existingInvitation } = await adminClient
            .from('invitations')
            .select('*')
            .eq('email', email)
            .eq('accepted', false)
            .gte('expires_at', new Date().toISOString())
            .single();

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
                appLogger.error('Failed to resend invitation email:', err);
            });

            // Return existing invitation
            return NextResponse.json({
                id: existingInvitation.id,
                email: existingInvitation.email,
                token: existingInvitation.token,
                expiresAt: existingInvitation.expires_at,
                accepted: existingInvitation.accepted,
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

        // Create invitation
        const { data: invitation, error } = await adminClient
            .from('invitations')
            .insert({
                email,
                token,
                expires_at: expiresAt.toISOString(),
                coach_id: coachIdToAssign,
                team_id: profile.team_id,
                accepted: false,
                role,
            })
            .select()
            .single();

        if (error) {
            appLogger.error('Error creating invitation:', error);
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
            appLogger.error('Failed to send invitation email:', err);
        });

        return NextResponse.json({
            id: invitation.id,
            email: invitation.email,
            token: invitation.token,
            expiresAt: invitation.expires_at,
            accepted: invitation.accepted,
        });
    } catch (error: unknown) {
        appLogger.error('Create invitation error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
