import crypto from 'crypto';
import type { NextFunction, Request, Response } from 'express';
import { db, getSetting, hashPassword, setSetting, verifyPassword } from './db.ts';

export const ADMIN_COOKIE_NAME = 'wnn_admin_session';
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function isHttpsRequest(req: Request): boolean {
  const xfProto = req.headers['x-forwarded-proto'];
  if (typeof xfProto === 'string' && xfProto.split(',')[0].trim() === 'https') {
    return true;
  }
  return req.secure;
}

export function setCookieOptions(req: Request, maxAgeMs: number) {
  const secure = isHttpsRequest(req);
  return {
    httpOnly: true,
    secure,
    sameSite: (secure ? 'none' : 'lax') as 'none' | 'lax',
    path: '/',
    maxAge: maxAgeMs,
  };
}

export function validateSessionToken(rawToken: string | undefined): boolean {
  if (!rawToken || typeof rawToken !== 'string') {
    return false;
  }
  const tokenHash = hashToken(rawToken);
  const nowIso = new Date().toISOString();
  const row = db
    .prepare('SELECT token_hash, expires_at FROM admin_sessions WHERE token_hash = ?')
    .get(tokenHash) as { token_hash: string; expires_at: string } | undefined;

  if (!row) {
    return false;
  }
  if (row.expires_at <= nowIso) {
    db.prepare('DELETE FROM admin_sessions WHERE token_hash = ?').run(tokenHash);
    return false;
  }
  return true;
}

export function isAdminAuthenticated(req: Request): boolean {
  const token = req.cookies?.[ADMIN_COOKIE_NAME];
  return validateSessionToken(token);
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!isAdminAuthenticated(req)) {
    res.status(401).json({ error: 'Unauthorized. Admin authentication required.' });
    return;
  }
  next();
}

export function loginAdmin(req: Request, res: Response): void {
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  if (!password) {
    res.status(400).json({ error: 'Password is required.' });
    return;
  }

  const storedHash = getSetting('admin_password_hash');
  if (!storedHash || !verifyPassword(password, storedHash)) {
    res.status(401).json({ error: 'Invalid administrator password.' });
    return;
  }

  // Prune expired sessions opportunistically
  db.prepare('DELETE FROM admin_sessions WHERE expires_at <= ?').run(new Date().toISOString());

  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(rawToken);
  const now = new Date();
  const expires = new Date(now.getTime() + SESSION_TTL_MS);

  db.prepare(`
    INSERT INTO admin_sessions (token_hash, created_at, expires_at, ip_address, user_agent)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    tokenHash,
    now.toISOString(),
    expires.toISOString(),
    req.ip || '',
    String(req.headers['user-agent'] || '').slice(0, 250)
  );

  res.cookie(ADMIN_COOKIE_NAME, rawToken, setCookieOptions(req, SESSION_TTL_MS));
  res.json({ authenticated: true });
}

export function logoutAdmin(req: Request, res: Response): void {
  const token = req.cookies?.[ADMIN_COOKIE_NAME];
  if (token && typeof token === 'string') {
    db.prepare('DELETE FROM admin_sessions WHERE token_hash = ?').run(hashToken(token));
  }
  const opts = setCookieOptions(req, 0);
  res.clearCookie(ADMIN_COOKIE_NAME, {
    httpOnly: opts.httpOnly,
    secure: opts.secure,
    sameSite: opts.sameSite,
    path: '/',
  });
  res.json({ authenticated: false });
}

export function changeAdminPassword(req: Request, res: Response): void {
  const currentPassword = typeof req.body?.currentPassword === 'string' ? req.body.currentPassword : '';
  const newPassword = typeof req.body?.newPassword === 'string' ? req.body.newPassword : '';

  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: 'Current password and new password are required.' });
    return;
  }
  if (newPassword.length < 6) {
    res.status(400).json({ error: 'New password must be at least 6 characters long.' });
    return;
  }

  const storedHash = getSetting('admin_password_hash');
  if (!verifyPassword(currentPassword, storedHash)) {
    res.status(401).json({ error: 'Current password is incorrect.' });
    return;
  }

  setSetting('admin_password_hash', hashPassword(newPassword));

  // Invalidate other sessions while preserving the current active session
  const currentToken = req.cookies?.[ADMIN_COOKIE_NAME];
  if (currentToken) {
    db.prepare('DELETE FROM admin_sessions WHERE token_hash != ?').run(hashToken(currentToken));
  } else {
    db.prepare('DELETE FROM admin_sessions').run();
  }

  res.json({ success: true, message: 'Administrator password updated securely.' });
}
