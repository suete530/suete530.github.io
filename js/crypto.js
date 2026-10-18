        export async function sha256(text) {
            const buf = new TextEncoder().encode(text);
            const buf2 = await crypto.subtle.digest('SHA-256', buf);
            return Array.from(new Uint8Array(buf2)).map(b => b.toString(16).padStart(2, '0')).join('');
        }
        export function isHashed(s) { return typeof s === 'string' && /^[a-f0-9]{64}$/.test(s); }

        export const PBKDF2_ITERATIONS = 100000;
        export function toHex(buf) { return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join(''); }
        export function fromHex(hex) { const out = new Uint8Array(hex.length / 2); for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.substr(i * 2, 2), 16); return out; }
        export function timingSafeEqualHex(a, b) {
            if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
            let diff = 0;
            for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
            return diff === 0;
        }
        export async function pbkdf2Hash(password, saltHex, iterations = PBKDF2_ITERATIONS) {
            const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
            const bits = await crypto.subtle.deriveBits(
                { name: 'PBKDF2', salt: fromHex(saltHex), iterations, hash: 'SHA-256' }, key, 256);
            return toHex(bits);
        }
        export async function hashPassword(password) {
            const salt = toHex(crypto.getRandomValues(new Uint8Array(16)));
            return { salt, hash: await pbkdf2Hash(password, salt), iter: PBKDF2_ITERATIONS, algo: 'PBKDF2-SHA256' };
        }
        export async function verifyPassword(password, record) {
            if (record && typeof record === 'object' && record.salt && record.hash) {
                const candidate = await pbkdf2Hash(password, record.salt, record.iter || PBKDF2_ITERATIONS);
                return timingSafeEqualHex(candidate, record.hash);
            }
            if (typeof record === 'string' && isHashed(record)) {
                return timingSafeEqualHex(await sha256(password), record);
            }
            if (typeof record === 'string') {
                let diff = 0;
                for (let i = 0; i < Math.max(password.length, record.length); i++) {
                    diff |= (password.charCodeAt(i) || 0) ^ (record.charCodeAt(i) || 0);
                }
                return diff === 0 && password.length === record.length;
            }
            return false;
        }
