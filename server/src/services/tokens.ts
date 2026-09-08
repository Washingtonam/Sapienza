import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import type { AuthenticatedUser } from '../types/auth.js';

type TokenPayload = Pick<AuthenticatedUser, 'id' | 'email'> & { roleIds: string[] };

export function createAccessToken(user: AuthenticatedUser) {
  return jwt.sign({ id: user.id, email: user.email, roleIds: user.roleIds.map(String) } satisfies TokenPayload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'] });
}

export function readAccessToken(token: string): TokenPayload {
  const payload = jwt.verify(token, env.JWT_SECRET);
  if (typeof payload === 'string' || !payload.id || !payload.email || !Array.isArray(payload.roleIds)) {
    throw new Error('Invalid access token');
  }
  return { id: String(payload.id), email: String(payload.email), roleIds: payload.roleIds.map(String) };
}
