import type { Request } from 'express';
import type { Types } from 'mongoose';

export type Permission =
  | 'users:read'
  | 'users:manage'
  | 'roles:manage'
  | 'audit:read'
  | 'academics:read'
  | 'academics:manage'
  | 'records:read'
  | 'records:manage'
  | 'records:submit'
  | 'finance:read'
  | 'finance:manage'
  | 'cbt:read'
  | 'cbt:manage'
  | 'cbt:attempt'
  | 'content:manage'
  | 'media:manage'
  | 'alumni:manage'
  | 'reports:read';

export type AuthenticatedUser = {
  id: string;
  email: string;
  roleIds: Types.ObjectId[];
};

export type AuthenticatedRequest = Request & { user?: AuthenticatedUser };
