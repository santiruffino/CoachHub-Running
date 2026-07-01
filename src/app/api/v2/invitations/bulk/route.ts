import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/api-helpers';
import { randomBytes } from 'crypto';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { sendInvitationEmail } from '@/lib/email/send';
import { reportApiError } from '@/lib/api/report-error';
import { createRequestLogger } from '@/lib/logger';

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
  const { requestId, logger } = createRequestLogger('/api/v2/invitations/bulk', request);
  try {
    // Only administrators can create bulk invitations
    const { user, profile, response } = await requireRole('ADMIN');

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

    const MAX_BULK_EMAILS = 100;
    if (emails.length > MAX_BULK_EMAILS) {
      return NextResponse.json(
        { error: `Cannot invite more than ${MAX_BULK_EMAILS} emails at once` },
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

    // Check team athlete limit (if set) for ATHLETE role
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

        const remaining = teamSettings.max_athletes - (currentAthletes ?? 0);
        if (remaining <= 0) {
          return NextResponse.json(
            { error: `El equipo ha alcanzado el límite de ${teamSettings.max_athletes} atletas. Actualiza el plan para añadir más.` },
            { status: 403 }
          );
        }

        // Limit the emails to remaining slots
        if (emails.length > remaining) {
          return NextResponse.json(
            { error: `Solo quedan ${remaining} plazas para atletas. Reduce la lista o actualiza el plan.` },
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

    const coachIdToAssign = (profile.role === 'ADMIN' || role === 'COACH') ? null : user!.id;
    const results: InviteResult[] = [];

    // Fetch team name and inviter profile for emails
    const [{ data: team }, { data: inviterProfile }] = await Promise.all([
      adminClient.from('teams').select('name').eq('id', profile.team_id).single(),
      adminClient.from('profiles').select('name, email').eq('id', user!.id).single(),
    ]);

    const teamName = team?.name || 'your team';
    const inviterName = inviterProfile?.name || inviterProfile?.email || 'your coach';

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
          .from('team_invite_links')
          .select('*')
          .eq('email', normalizedEmail)
          .eq('is_active', true)
          .gte('expires_at', new Date().toISOString())
          .maybeSingle();

        if (existingInvitation) {
          results.push({ 
            email: normalizedEmail, 
            status: 'pending', 
            token: existingInvitation.token 
          });

          // Resend invitation email before continuing
          await sendInvitationEmail({
            to: normalizedEmail,
            inviterName,
            teamName,
            role: existingInvitation.role || role,
            token: existingInvitation.token,
            expiresAt: new Date(existingInvitation.expires_at),
          }).catch((err) => {
            reportApiError(err, { route: '/api/v2/invitations/bulk', method: 'POST', extra: { event: 'invitations.resend_email_failed', email: normalizedEmail } });
          });

          continue;
        }

        // 3. Create new invitation (single-use, email-targeted team_invite_links row)
        const token = randomBytes(32).toString('hex');
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        const { data: invitation, error } = await adminClient
          .from('team_invite_links')
          .insert({
            team_id: profile.team_id,
            created_by: user!.id,
            role,
            token,
            email: normalizedEmail,
            coach_id: coachIdToAssign,
            is_active: true,
            expires_at: expiresAt.toISOString(),
            max_uses: 1,
            uses: 0,
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

          // Send invitation email before continuing
          await sendInvitationEmail({
            to: normalizedEmail,
            inviterName,
            teamName,
            role,
            token: invitation.token,
            expiresAt,
          }).catch((err) => {
            reportApiError(err, { route: '/api/v2/invitations/bulk', method: 'POST', extra: { event: 'invitations.send_email_failed', email: normalizedEmail } });
          });
        }
      } catch (err) {
        reportApiError(err, { route: '/api/v2/invitations/bulk', method: 'POST', extra: { event: 'invitations.bulk_item_failed', email } });
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
    reportApiError(error, { route: '/api/v2/invitations/bulk', method: 'POST', requestId, logger });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
