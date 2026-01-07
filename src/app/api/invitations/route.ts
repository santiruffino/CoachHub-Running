import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/api-helpers';
import { randomBytes } from 'crypto';

export async function POST(request: NextRequest) {
    try {
        // Only coaches can create invitations
        const authResult = await requireRole('COACH');

        if (authResult.response) {
            return authResult.response;
        }

        const { email } = await request.json();

        if (!email) {
            return NextResponse.json(
                { error: 'Email is required' },
                { status: 400 }
            );
        }

        const { supabase, user } = authResult;

        // Check if user already exists
        const { data: existingProfile } = await supabase
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
        const { data: existingInvitation } = await supabase
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
            });
        }

        // Generate unique token
        const token = randomBytes(32).toString('hex');

        // Set expiration to 7 days from now
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        // Create invitation
        const { data: invitation, error } = await supabase
            .from('invitations')
            .insert({
                email,
                token,
                expires_at: expiresAt.toISOString(),
                coach_id: user!.id,
                accepted: false,
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
    } catch (error: any) {
        console.error('Create invitation error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
