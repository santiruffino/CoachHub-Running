import { createHmac, randomBytes, timingSafeEqual } from 'crypto';

export const STRAVA_OAUTH_STATE_TTL_SECONDS = 60 * 10;

type CreateOauthStateInput = {
  userId: string;
  secret: string;
};

type VerifyOauthStateInput = {
  state: string;
  cookieValue: string | undefined;
  userId: string;
  secret: string;
  nowMs?: number;
};

type VerifyOauthStateResult = {
  isValid: boolean;
  reason?: 'missing_cookie' | 'malformed_cookie' | 'expired' | 'state_mismatch' | 'signature_mismatch';
};

function signState(userId: string, state: string, expiresAtMs: number, secret: string): string {
  return createHmac('sha256', secret)
    .update(`${userId}.${state}.${expiresAtMs}`)
    .digest('hex');
}

function safeEqualText(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

export function createSignedStravaOauthState(input: CreateOauthStateInput) {
  const state = randomBytes(32).toString('hex');
  const expiresAtMs = Date.now() + STRAVA_OAUTH_STATE_TTL_SECONDS * 1000;
  const signature = signState(input.userId, state, expiresAtMs, input.secret);

  return {
    state,
    cookieValue: `${state}.${expiresAtMs}.${signature}`,
    maxAgeSeconds: STRAVA_OAUTH_STATE_TTL_SECONDS,
  };
}

export function verifySignedStravaOauthState(input: VerifyOauthStateInput): VerifyOauthStateResult {
  if (!input.cookieValue) {
    return { isValid: false, reason: 'missing_cookie' };
  }

  const [stateFromCookie, expiresAtRaw, signature] = input.cookieValue.split('.');
  if (!stateFromCookie || !expiresAtRaw || !signature) {
    return { isValid: false, reason: 'malformed_cookie' };
  }

  const expiresAtMs = Number.parseInt(expiresAtRaw, 10);
  if (!Number.isFinite(expiresAtMs)) {
    return { isValid: false, reason: 'malformed_cookie' };
  }

  const nowMs = input.nowMs ?? Date.now();
  if (expiresAtMs <= nowMs) {
    return { isValid: false, reason: 'expired' };
  }

  if (!safeEqualText(stateFromCookie, input.state)) {
    return { isValid: false, reason: 'state_mismatch' };
  }

  const expectedSignature = signState(input.userId, stateFromCookie, expiresAtMs, input.secret);
  if (!safeEqualText(signature, expectedSignature)) {
    return { isValid: false, reason: 'signature_mismatch' };
  }

  return { isValid: true };
}
