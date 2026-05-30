import { AppRole } from '@/lib/supabase/api-helpers';

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

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invitación a Endurix</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="480" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <tr>
            <td style="background-color: #18181b; padding: 32px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700;">Endurix</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 32px;">
              <h2 style="color: #18181b; margin: 0 0 16px; font-size: 20px; font-weight: 600;">
                Has sido invitado a ${teamName}
              </h2>
              <p style="color: #52525b; margin: 0 0 24px; font-size: 16px; line-height: 1.5;">
                <strong>${inviterName}</strong> te ha invitado a unirte como <strong>${roleLabel}</strong> al equipo <strong>${teamName}</strong> en Endurix.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
                <tr>
                  <td align="center">
                    <a href="${acceptUrl}" style="display: inline-block; background-color: #18181b; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-size: 16px; font-weight: 600;">
                      Aceptar invitación
                    </a>
                  </td>
                </tr>
              </table>
              <p style="color: #71717a; margin: 0 0 8px; font-size: 14px; line-height: 1.5;">
                Esta invitación expira el <strong>${expiryDate}</strong>.
              </p>
              <p style="color: #71717a; margin: 0; font-size: 14px; line-height: 1.5;">
                Si no solicitaste esta invitación, puedes ignorar este mensaje.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #fafafa; padding: 24px 32px; border-top: 1px solid #e4e4e7;">
              <p style="color: #a1a1aa; margin: 0; font-size: 12px; text-align: center;">
                Endurix — Plataforma de gestión para entrenadores y atletas
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
