import { Schema, model } from 'mongoose';
import type { Permission } from '../types/auth.js';

const roleSchema = new Schema({
  name: { type: String, required: true, unique: true, trim: true },
  permissions: { type: [String], required: true, default: [] }
}, { timestamps: true });

export const Role = model('Role', roleSchema);
export const defaultPermissions: Record<string, Permission[]> = {
  super_admin: ['users:read', 'users:manage', 'roles:manage', 'audit:read', 'academics:read', 'academics:manage', 'records:read', 'records:manage', 'finance:read', 'finance:manage', 'cbt:read', 'cbt:manage', 'cbt:attempt', 'content:manage', 'media:manage', 'alumni:manage', 'reports:read'],
  admin: ['users:read', 'users:manage', 'audit:read', 'academics:read', 'academics:manage', 'records:read', 'records:manage', 'finance:read', 'finance:manage', 'cbt:read', 'cbt:manage', 'cbt:attempt', 'content:manage', 'media:manage', 'alumni:manage', 'reports:read'],
  teacher: ['users:read', 'academics:read', 'records:read', 'records:manage', 'cbt:read', 'cbt:manage'],
  student: ['records:read', 'records:submit', 'cbt:read', 'cbt:attempt'],
  parent: [],
  alumni: ['alumni:manage']
};
