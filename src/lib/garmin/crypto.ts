/**
 * Application-level encryption for Garmin session tokens.
 *
 * Garmin tokens grant full access to the athlete's account, so unlike the
 * Strava tokens (read-only scope, RLS-protected plaintext) they are encrypted
 * at rest with AES-256-GCM. The key comes from GARMIN_TOKEN_ENC_KEY (32 bytes,
 * base64 or hex). Ciphertext is stored as `iv:tag:data`, all base64.
 */

import crypto from 'node:crypto';

const ALGO = 'aes-256-gcm';
const IV_BYTES = 12;

function getKey(): Buffer {
    const raw = process.env.GARMIN_TOKEN_ENC_KEY;
    if (!raw) {
        throw new Error('GARMIN_TOKEN_ENC_KEY is not set');
    }
    // Accept base64 (44 chars) or hex (64 chars); must decode to 32 bytes.
    const key = /^[0-9a-fA-F]{64}$/.test(raw)
        ? Buffer.from(raw, 'hex')
        : Buffer.from(raw, 'base64');
    if (key.length !== 32) {
        throw new Error('GARMIN_TOKEN_ENC_KEY must decode to 32 bytes (256 bits)');
    }
    return key;
}

export function encryptToken(plaintext: string): string {
    const key = getKey();
    const iv = crypto.randomBytes(IV_BYTES);
    const cipher = crypto.createCipheriv(ALGO, key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`;
}

export function decryptToken(payload: string): string {
    const key = getKey();
    const [ivB64, tagB64, dataB64] = payload.split(':');
    if (!ivB64 || !tagB64 || !dataB64) {
        throw new Error('Malformed encrypted token payload');
    }
    const decipher = crypto.createDecipheriv(ALGO, key, Buffer.from(ivB64, 'base64'));
    decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
    const decrypted = Buffer.concat([
        decipher.update(Buffer.from(dataB64, 'base64')),
        decipher.final(),
    ]);
    return decrypted.toString('utf8');
}

/** Convenience helpers for JSON token blobs. */
export function encryptJson(value: unknown): string {
    return encryptToken(JSON.stringify(value));
}

export function decryptJson<T>(payload: string): T {
    return JSON.parse(decryptToken(payload)) as T;
}
