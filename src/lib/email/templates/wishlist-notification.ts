export type WishlistRole = 'head_coach' | 'assistant_coach' | 'other';
export type WishlistTeamSize = '1_5' | '6_15' | '16_30' | '30_plus';

const ROLE_LABELS: Record<WishlistRole, string> = {
    head_coach: 'Head Coach',
    assistant_coach: 'Coach Asistente',
    other: 'Otro',
};

const TEAM_SIZE_LABELS: Record<WishlistTeamSize, string> = {
    '1_5': '1 — 5 atletas',
    '6_15': '6 — 15 atletas',
    '16_30': '16 — 30 atletas',
    '30_plus': '30+ atletas',
};

export interface WishlistNotificationParams {
    name: string;
    email: string;
    role: WishlistRole;
    teamSize: WishlistTeamSize;
    locale: string | null;
    userAgent: string | null;
    createdAt: Date;
    appUrl?: string;
}

function escape(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

export function wishlistNotificationEmailTemplate({
    name,
    email,
    role,
    teamSize,
    locale,
    userAgent,
    createdAt,
    appUrl = 'https://endurix.app',
}: WishlistNotificationParams): string {
    const safeName = escape(name);
    const safeEmail = escape(email);
    const safeLocale = escape(locale ?? '—');
    const safeUa = escape(userAgent ?? '—');
    const roleLabel = ROLE_LABELS[role];
    const teamSizeLabel = TEAM_SIZE_LABELS[teamSize];
    const timestamp = createdAt.toLocaleString('es-AR', {
        dateStyle: 'long',
        timeStyle: 'short',
    });
    const adminUrl = `${appUrl.replace(/\/$/, '')}/settings/team`;

    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nuevo signup en la wishlist</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <tr>
            <td style="background-color: #0A0A0A; padding: 24px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <p style="margin: 0; color: #FF6800; font-size: 11px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase;">
                      Wishlist · Endurix
                    </p>
                    <h1 style="margin: 6px 0 0; color: #ffffff; font-size: 22px; font-weight: 700;">
                      Nuevo signup
                    </h1>
                  </td>
                  <td align="right" style="vertical-align: top;">
                    <span style="display: inline-block; background-color: #FF6800; color: #ffffff; font-size: 10px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; padding: 6px 10px;">
                      Acceso anticipado
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 24px; color: #18181b; font-size: 16px; line-height: 1.5;">
                <strong>${safeName}</strong> quiere sumarse al acceso anticipado de Endurix.
              </p>

              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fafafa; border: 1px solid #e4e4e7; border-left: 3px solid #FF6800; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 20px 24px;">
                    <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 14px; line-height: 1.6;">
                      <tr>
                        <td style="color: #71717a; font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; padding-bottom: 4px; width: 110px;">
                          Nombre
                        </td>
                        <td style="color: #18181b; font-weight: 600; padding-bottom: 4px;">
                          ${safeName}
                        </td>
                      </tr>
                      <tr>
                        <td style="color: #71717a; font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; padding-bottom: 4px;">
                          Email
                        </td>
                        <td style="color: #18181b; padding-bottom: 4px;">
                          <a href="mailto:${safeEmail}" style="color: #FF6800; text-decoration: none;">${safeEmail}</a>
                        </td>
                      </tr>
                      <tr>
                        <td style="color: #71717a; font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; padding-bottom: 4px;">
                          Rol
                        </td>
                        <td style="color: #18181b; padding-bottom: 4px;">
                          ${roleLabel}
                        </td>
                      </tr>
                      <tr>
                        <td style="color: #71717a; font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; padding-bottom: 4px;">
                          Tamaño
                        </td>
                        <td style="color: #18181b; padding-bottom: 4px;">
                          ${teamSizeLabel}
                        </td>
                      </tr>
                      <tr>
                        <td style="color: #71717a; font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; padding-bottom: 4px;">
                          Locale
                        </td>
                        <td style="color: #18181b; font-family: ui-monospace, SFMono-Regular, monospace; font-size: 12px; padding-bottom: 4px;">
                          ${safeLocale}
                        </td>
                      </tr>
                      <tr>
                        <td style="color: #71717a; font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;">
                          Cuándo
                        </td>
                        <td style="color: #18181b;">
                          ${timestamp}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 20px; color: #52525b; font-size: 14px; line-height: 1.6;">
                Responderle rápido ayuda a mantener el compromiso del early adopter. Si decidís que es un buen fit, mandale un email personalizado antes que se enfríe.
              </p>

              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="left">
                    <a href="mailto:${safeEmail}?subject=Endurix%20%E2%80%94%20Acceso%20anticipado" style="display: inline-block; background-color: #FF6800; color: #ffffff; text-decoration: none; padding: 12px 24px; font-size: 13px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;">
                      Responder a ${safeName}
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background-color: #fafafa; padding: 20px 32px; border-top: 1px solid #e4e4e7;">
              <p style="margin: 0; color: #a1a1aa; font-size: 11px; text-align: center; line-height: 1.5;">
                User agent: <span style="color: #71717a;">${safeUa}</span><br>
                <a href="${adminUrl}" style="color: #a1a1aa; text-decoration: underline;">Ver todos los signups</a>
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
