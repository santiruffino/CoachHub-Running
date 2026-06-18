import { resend } from './resend';
import { invitationEmailTemplate } from './templates/invitation';
import {
  wishlistNotificationEmailTemplate,
  WishlistRole,
  WishlistTeamSize,
} from './templates/wishlist-notification';
import { AppRole } from '@/lib/supabase/api-helpers';
import { appLogger } from '@/lib/app-logger';

const FROM_ADDRESS = 'Endurix <invitations@info.endurix.app>';
const WISHLIST_FROM_ADDRESS = 'Endurix Wishlist <wishlist@info.endurix.app>';

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

interface SendWishlistNotificationEmailParams {
  name: string;
  email: string;
  role: WishlistRole;
  teamSize: WishlistTeamSize;
  locale: string | null;
  userAgent: string | null;
  createdAt: Date;
  /** Pass the inserted row id for idempotency. Falls back to a hash of email+date. */
  signupId?: string;
}

export async function sendWishlistNotificationEmail({
  name,
  email,
  role,
  teamSize,
  locale,
  userAgent,
  createdAt,
  signupId,
}: SendWishlistNotificationEmailParams): Promise<{ sent: boolean; reason?: string }> {
  const to = process.env.WISHLIST_NOTIFY_EMAIL;
  const from = process.env.WISHLIST_FROM_EMAIL || WISHLIST_FROM_ADDRESS;

  if (!to) {
    appLogger.warn(
      '[wishlist] WISHLIST_NOTIFY_EMAIL not configured — skipping notification',
      { email },
    );
    return { sent: false, reason: 'WISHLIST_NOTIFY_EMAIL not set' };
  }

  const appUrl = process.env.APP_URL || 'https://endurix.app';
  const html = wishlistNotificationEmailTemplate({
    name,
    email,
    role,
    teamSize,
    locale,
    userAgent,
    createdAt,
    appUrl,
  });

  const idempotencyKey = signupId
    ? `wishlist/${signupId}`
    : `wishlist/${Buffer.from(`${email}|${createdAt.toISOString()}`).toString('base64url')}`;

  const { error } = await resend.emails.send(
    {
      from,
      to: [to],
      replyTo: email,
      subject: `🎯 Nuevo signup en la wishlist: ${name}`,
      html,
    },
    {
      idempotencyKey,
    },
  );

  if (error) {
    appLogger.error('[wishlist] Failed to send notification email', {
      to,
      error: error.message,
    });
    return { sent: false, reason: error.message };
  }

  return { sent: true };
}
