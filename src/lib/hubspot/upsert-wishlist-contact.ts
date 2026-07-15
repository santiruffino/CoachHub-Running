import { appLogger } from '@/lib/app-logger';
import type { WishlistTeamSize } from '@/lib/email/templates/wishlist-notification';

const HUBSPOT_UPSERT_URL =
  'https://api.hubapi.com/crm/v3/objects/contacts/batch/upsert';

// Abort the outbound call if HubSpot is slow so it never delays the signup
// response (the contact sync is best-effort and the signup is already saved).
const HUBSPOT_TIMEOUT_MS = 8_000;

// Internal names of the HubSpot contact properties this integration writes to.
// `company` is a HubSpot standard property; the `endurix_*` ones are custom
// properties that must be created in HubSpot (Settings → Properties → Contact).
// If a custom property doesn't exist yet, the upsert gracefully falls back to
// the standard properties only (see below) so the contact still syncs.
const TEAM_SIZE_PROPERTY = 'endurix_team_size';
const SOURCE_PROPERTY = 'endurix_lead_source';
const SOURCE_VALUE = 'Endurix Landing – Wishlist';

const TEAM_SIZE_LABELS: Record<WishlistTeamSize, string> = {
  '1_5': '1 — 5 atletas',
  '6_15': '6 — 15 atletas',
  '16_30': '16 — 30 atletas',
  '30_plus': '30+ atletas',
};

interface UpsertWishlistContactParams {
  name: string;
  email: string;
  teamName: string;
  teamSize: WishlistTeamSize;
}

interface UpsertResult {
  synced: boolean;
  reason?: string;
}

/**
 * Splits a full name into HubSpot's firstname / lastname pair. Everything after
 * the first token becomes the last name; single-token names have no last name.
 */
function splitName(name: string): { firstname: string; lastname?: string } {
  const parts = name.trim().split(/\s+/);
  const firstname = parts.shift() ?? '';
  const lastname = parts.join(' ');
  return lastname ? { firstname, lastname } : { firstname };
}

/**
 * Sends a single-contact upsert (matched by email) to HubSpot with a timeout.
 */
async function sendUpsert(
  token: string,
  email: string,
  properties: Record<string, string>,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), HUBSPOT_TIMEOUT_MS);
  try {
    return await fetch(HUBSPOT_UPSERT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        inputs: [{ idProperty: 'email', id: email, properties }],
      }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Best-effort upsert of a wishlist signup into HubSpot as a CRM contact
 * (matched by email). Requires a Private App token in `HUBSPOT_ACCESS_TOKEN`.
 *
 * Standard properties (`email`, `firstname`/`lastname`, and `company` for the
 * team name) are always sent. Team size and lead source are written to the
 * custom properties `endurix_team_size` / `endurix_lead_source`; if those aren't
 * created in HubSpot yet, HubSpot rejects the whole request, so we retry once
 * with the standard properties only — the contact still syncs and a warning is
 * logged so the missing property gets created.
 *
 * Never throws: on any failure it logs and returns `{ synced: false }` so the
 * caller (the wishlist route) can treat it as fire-and-forget.
 */
export async function upsertWishlistContact({
  name,
  email,
  teamName,
  teamSize,
}: UpsertWishlistContactParams): Promise<UpsertResult> {
  const token = process.env.HUBSPOT_ACCESS_TOKEN;

  if (!token) {
    appLogger.warn(
      '[hubspot] HUBSPOT_ACCESS_TOKEN not configured — skipping contact sync',
      { email },
    );
    return { synced: false, reason: 'HUBSPOT_ACCESS_TOKEN not set' };
  }

  const standardProperties: Record<string, string> = {
    email,
    ...splitName(name),
    // Team name maps to the standard `company` contact property.
    company: teamName,
  };

  const fullProperties: Record<string, string> = {
    ...standardProperties,
    [TEAM_SIZE_PROPERTY]: TEAM_SIZE_LABELS[teamSize],
    [SOURCE_PROPERTY]: SOURCE_VALUE,
  };

  try {
    let response = await sendUpsert(token, email, fullProperties);

    // A 400 most likely means a custom property (endurix_team_size /
    // endurix_lead_source) doesn't exist in HubSpot yet — it rejects the whole
    // request. Fall back to the standard properties so the contact still syncs.
    if (response.status === 400) {
      const detail = await response.text().catch(() => '');
      appLogger.warn(
        '[hubspot] Full upsert rejected — retrying with standard properties only',
        { email, detail: detail.slice(0, 500) },
      );
      response = await sendUpsert(token, email, standardProperties);
    }

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      appLogger.error('[hubspot] Contact upsert failed', {
        email,
        status: response.status,
        // HubSpot error bodies can be verbose; cap for the log line.
        detail: detail.slice(0, 500),
      });
      return { synced: false, reason: `HTTP ${response.status}` };
    }

    return { synced: true };
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'unknown error';
    appLogger.error('[hubspot] Contact upsert threw', { email, reason });
    return { synced: false, reason };
  }
}
