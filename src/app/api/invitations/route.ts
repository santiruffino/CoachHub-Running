import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/api-helpers';
import { randomBytes } from 'crypto';
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
    try {
        // Only coaches can create invitations
        const authResult = await requireRole('COACH');

        if (authResult.response) {
            return authResult.response;
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

        const { supabase, user } = authResult;
        const adminClient = createServiceRoleClient();

        // In order to send invitations to the same club, we need the inviter's team_id
        const { data: inviterProfile } = await supabase
            .from('profiles')
            .select('role, team_id')
            .eq('id', user!.id)
            .single();

        if (!inviterProfile?.team_id) {
            return NextResponse.json(
                { error: 'You must belong to a running team to invite users.' },
                { status: 400 }
            );
        }

        if (role === 'COACH' && inviterProfile.role !== 'ADMIN') {
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
        const coachIdToAssign = (inviterProfile.role === 'ADMIN' || role === 'COACH') ? null : user!.id;

        // Create invitation
        const { data: invitation, error } = await adminClient
            .from('invitations')
            .insert({
                email,
                token,
                expires_at: expiresAt.toISOString(),
                coach_id: coachIdToAssign,
                team_id: inviterProfile.team_id,
                accepted: false,
                role,
            })
            .select()
            .single();

        if (error) {
            console.error('Error creating invitation:', error);
            return NextResponse.json(
                { error: 'Failed to create invitation' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            id: invitation.id,
            email: invitation.email,
            token: invitation.token,
            expiresAt: invitation.expires_at,
            accepted: invitation.accepted,
        });
    } catch (error: unknown) {
        console.error('Create invitation error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
