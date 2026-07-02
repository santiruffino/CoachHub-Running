import { beforeAll, describe, expect, it } from 'vitest';
import crypto from 'node:crypto';

let encryptToken: typeof import('./crypto').encryptToken;
let decryptToken: typeof import('./crypto').decryptToken;
let encryptJson: typeof import('./crypto').encryptJson;
let decryptJson: typeof import('./crypto').decryptJson;

beforeAll(async () => {
    process.env.GARMIN_TOKEN_ENC_KEY = crypto.randomBytes(32).toString('base64');
    const mod = await import('./crypto');
    ({ encryptToken, decryptToken, encryptJson, decryptJson } = mod);
});

describe('garmin token crypto', () => {
    it('round-trips a string', () => {
        const secret = 'oauth_token_secret_value';
        const enc = encryptToken(secret);
        expect(enc).not.toContain(secret);
        expect(enc.split(':')).toHaveLength(3);
        expect(decryptToken(enc)).toBe(secret);
    });

    it('produces a different ciphertext each time (random IV)', () => {
        expect(encryptToken('same')).not.toBe(encryptToken('same'));
    });

    it('round-trips a JSON token blob', () => {
        const tokens = { oauth1: { oauth_token: 'a', oauth_token_secret: 'b' }, expires_at: 123 };
        expect(decryptJson(encryptJson(tokens))).toEqual(tokens);
    });

    it('rejects a tampered payload', () => {
        const enc = encryptToken('secret');
        const [iv, tag, data] = enc.split(':');
        const tampered = `${iv}:${tag}:${Buffer.from('garbage').toString('base64')}`;
        expect(() => decryptToken(tampered)).toThrow();
        expect(iv && tag && data).toBeTruthy();
    });
});
