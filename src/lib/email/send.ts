import { resend } from './resend';
import { invitationEmailTemplate } from './templates/invitation';
import { AppRole } from '@/lib/supabase/api-helpers';
import { appLogger } from '@/lib/app-logger';

const FROM_ADDRESS = 'Endurix <info@endurix.app>';

interface SendInvitationEmailParams {
  to: string;
  inviterName: string;
  teamName: string;
  role: AppRole;
  token: string;
  expiresAt: Date;
}

export async function sendInvitationEmail({
  to,
  inviterName,
  teamName,
  role,
  token,
  expiresAt,
}: SendInvitationEmailParams): Promise<void> {
  const appUrl = process.env.APP_URL || 'https://endurix.app';
  const acceptUrl = `${appUrl}/accept-invitation?token=${token}`;

  const html = invitationEmailTemplate({
    inviterName,
    teamName,
    role,
    acceptUrl,
    expiresAt,
  });

  const { error } = await resend.emails.send(
    {
      from: FROM_ADDRESS,
      to: [to],
      subject: `Invitación a ${teamName} en Endurix`,
      html,
    },
    {
      idempotencyKey: `invitation/${token}`,
    }
  );

  if (error) {
    appLogger.error('Failed to send invitation email', {
      to,
      error: error.message,
    });
  }
}
