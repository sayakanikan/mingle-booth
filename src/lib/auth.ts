import crypto from 'node:crypto';
import { cookies } from 'next/headers';

const SESSION_COOKIE_NAME = 'mb_admin_session';
const SESSION_SECRET = process.env.SESSION_SECRET || 'mingle-booth-default-session-secret-key-32b';
const SESSION_DURATION_HOURS = 12;

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString('hex');
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) reject(err);
      resolve(`${salt}:${derivedKey.toString('hex')}`);
    });
  });
}

export async function verifyPassword(password: string, storedHashOrPlain: string | null): Promise<boolean> {
  if (!storedHashOrPlain) return false;

  // Backward compatibility with initial seed plaintext 'admin1234'
  if (!storedHashOrPlain.includes(':')) {
    return password === storedHashOrPlain;
  }

  const [salt, key] = storedHashOrPlain.split(':');
  if (!salt || !key) return false;

  return new Promise((resolve) => {
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) return resolve(false);
      try {
        const keyBuffer = Buffer.from(key, 'hex');
        resolve(crypto.timingSafeEqual(keyBuffer, derivedKey));
      } catch {
        resolve(false);
      }
    });
  });
}

export function signToken(data: string): string {
  const hmac = crypto.createHmac('sha256', SESSION_SECRET);
  hmac.update(data);
  return `${data}.${hmac.digest('hex')}`;
}

export function verifyToken(token: string): boolean {
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [data, signature] = parts;
  const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(data).digest('hex');
  try {
    const isMatch = crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expectedSig, 'hex'));
    if (!isMatch) return false;
    const expiresAt = parseInt(data, 10);
    return Date.now() < expiresAt;
  } catch {
    return false;
  }
}

export async function setAdminSession() {
  const cookieStore = await cookies();
  const expiresAt = Date.now() + SESSION_DURATION_HOURS * 60 * 60 * 1000;
  const token = signToken(String(expiresAt));

  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_DURATION_HOURS * 60 * 60,
  });
}

export async function clearAdminSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return false;
  return verifyToken(token);
}

export async function requireAdmin() {
  const authed = await isAdminAuthenticated();
  if (!authed) {
    throw new Error('Unauthorized');
  }
}
