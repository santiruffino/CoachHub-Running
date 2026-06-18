import { AppRole } from '@/lib/supabase/api-helpers';
import { escapeHtml, loadEmailTemplate, renderEmailTemplate } from './template-utils';

const INVITATION_TEMPLATE = loadEmailTemplate('invitation.html');

interface InvitationEmailParams {
  inviterName: string;
  teamName: string;
  role: AppRole;
  acceptUrl: string;
  expiresAt: Date;
}

function getRoleLabel(role: AppRole): string {
  switch (role) {
    case 'COACH':
      return 'entrenador';
    case 'ADMIN':
      return 'administrador';
    default:
      return 'atleta';
  }
}

export function invitationEmailTemplate({
  inviterName,
  teamName,
  role,
  acceptUrl,
  expiresAt,
}: InvitationEmailParams): string {
  const roleLabel = getRoleLabel(role);
  const expiryDate = expiresAt.toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return renderEmailTemplate(INVITATION_TEMPLATE, {
    inviterName: escapeHtml(inviterName),
    teamName: escapeHtml(teamName),
    roleLabel: escapeHtml(roleLabel),
    acceptUrl: escapeHtml(acceptUrl),
    expiryDate: escapeHtml(expiryDate),
  });
}
