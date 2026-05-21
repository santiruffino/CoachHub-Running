import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/api-helpers';
import { randomBytes } from 'crypto';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { appLogger } from '@/lib/app-logger';

interface BulkInviteRequest {
  emails: string[];
  role?: 'ATHLETE' | 'COACH';
}

interface InviteResult {
  email: string;
  status: 'success' | 'failed' | 'exists' | 'pending';
  error?: string;
  token?: string;
}

export async function POST(request: NextRequest) {
  try {
    // Only coaches can create invitations
    const { user, supabase, profile, response } = await requireRole('COACH');

    if (response) {
      return response;
    }

    const { emails, role = 'ATHLETE' } = (await request.json()) as BulkInviteRequest;

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json(
        { error: 'A list of emails is required' },
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

    if (role === 'COACH' && profile.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Only administrators can invite other coaches.' },
        { status: 403 }
      );
    }

    const coachIdToAssign = (profile.role === 'ADMIN' || role === 'COACH') ? null : user!.id;
    const results: InviteResult[] = [];

    // Process invitations in batches or loop (for simplicity and per-email reporting)
    for (const email of emails) {
      try {
        const normalizedEmail = email.toLowerCase().trim();
        if (!normalizedEmail) continue;

        // 1. Check if user already exists
        const { data: existingProfile } = await adminClient
          .from('profiles')
          .select('email')
          .eq('email', normalizedEmail)
          .single();

        if (existingProfile) {
          results.push({ email: normalizedEmail, status: 'exists', error: 'User already exists' });
          continue;
        }

        // 2. Check if there's already a pending invitation
        const { data: existingInvitation } = await adminClient
          .from('invitations')
          .select('*')
          .eq('email', normalizedEmail)
          .eq('accepted', false)
          .gte('expires_at', new Date().toISOString())
          .single();

        if (existingInvitation) {
          results.push({ 
            email: normalizedEmail, 
            status: 'pending', 
            token: existingInvitation.token 
          });
          continue;
        }

        // 3. Create new invitation
        const token = randomBytes(32).toString('hex');
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        const { data: invitation, error } = await adminClient
          .from('invitations')
          .insert({
            email: normalizedEmail,
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
          results.push({ email: normalizedEmail, status: 'failed', error: 'Database error' });
        } else {
          results.push({ 
            email: normalizedEmail, 
            status: 'success', 
            token: invitation.token 
          });
        }
      } catch (err) {
        appLogger.error(`Bulk invite error for ${email}:`, err);
        results.push({ email, status: 'failed', error: 'Internal error' });
      }
    }

    return NextResponse.json({
      summary: {
        total: results.length,
        success: results.filter(r => r.status === 'success').length,
        failed: results.filter(r => r.status === 'failed').length,
        exists: results.filter(r => r.status === 'exists').length,
        pending: results.filter(r => r.status === 'pending').length,
      },
      results
    });

  } catch (error: unknown) {
    appLogger.error('Bulk invitation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
