import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!);
const COOKIE_NAME = 'session';
const SESSION_DURATION = '30d';

export interface SessionPayload {
  userId: string;
  associationId: string;
  role: 'admin' | 'resident' | 'staff';
  flatId: string | null;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(SESSION_DURATION)
    .sign(JWT_SECRET);
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export function serializeSessionCookie(token: string): string {
  const maxAge = 60 * 60 * 24 * 30;
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${COOKIE_NAME}=${token}; HttpOnly; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`;
}

export function clearSessionCookie(): string {
  return `${COOKIE_NAME}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`;
}

export function parseSessionCookie(cookieHeader: string | undefined): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
  return match ? match[1] : null;
}

export async function requireAuth(req: VercelRequest, res: VercelResponse): Promise<SessionPayload | null> {
  const token = parseSessionCookie(req.headers.cookie);
  if (!token) { res.status(401).json({ error: 'Not authenticated' }); return null; }
  const payload = await verifySessionToken(token);
  if (!payload) { res.status(401).json({ error: 'Not authenticated' }); return null; }
  return payload;
}

export async function requireAdmin(req: VercelRequest, res: VercelResponse): Promise<SessionPayload | null> {
  const session = await requireAuth(req, res);
  if (!session) return null;
  if (session.role !== 'admin') { res.status(403).json({ error: 'Admin access required' }); return null; }
  return session;
}
