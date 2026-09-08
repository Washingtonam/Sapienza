import type { NextFunction, Response } from 'express';
import type { AuthenticatedRequest, Permission } from '../types/auth.js';
import { readAccessToken } from '../services/tokens.js';
import { Role } from '../models/Role.js';
import { User } from '../models/User.js';

export async function authenticate(request: AuthenticatedRequest, response: Response, next: NextFunction) {
  const header = request.header('authorization');
  if (!header?.startsWith('Bearer ')) {
    response.status(401).json({ error: 'Authentication required' });
    return;
  }

  try {
    const tokenUser = readAccessToken(header.slice(7));
    const currentUser = await User.findById(tokenUser.id).select('email roleIds status').lean();
    if (!currentUser || currentUser.status !== 'active') {
      response.status(401).json({ error: 'Account unavailable' });
      return;
    }
    request.user = { id: String(currentUser._id), email: currentUser.email, roleIds: currentUser.roleIds };
    next();
  } catch {
    response.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requirePermission(permission: Permission) {
  return async (request: AuthenticatedRequest, response: Response, next: NextFunction) => {
    if (!request.user) {
      response.status(401).json({ error: 'Authentication required' });
      return;
    }
    const roles = await Role.find({ _id: { $in: request.user.roleIds } }).select('permissions').lean();
    const allowed = roles.some((role) => role.permissions.includes(permission));
    if (!allowed) {
      response.status(403).json({ error: 'Insufficient permissions' });
      return;
    }
    next();
  };
}
