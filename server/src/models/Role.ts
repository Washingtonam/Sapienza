import { Schema, model } from 'mongoose';
import type { Permission } from '../types/auth.js';

const roleSchema = new Schema({
  name: { type: String, required: true, unique: true, trim: true },
  permissions: { type: [String], required: true, default: [] }
}, { timestamps: true });

export const Role = model('Role', roleSchema);
export const defaultPermissions: Record<string, Permission[]> = {
  super_admin: ['users:read', 'users:manage', 'roles:manage', 'audit:read', 'academics:read', 'academics:manage', 'academics:enroll', 'records:read', 'records:manage', 'finance:read', 'finance:manage', 'cbt:read', 'cbt:manage', 'cbt:attempt', 'content:manage', 'media:manage', 'alumni:manage', 'reports:read'],
  admin: ['users:read', 'users:manage', 'roles:manage', 'audit:read', 'academics:read', 'academics:manage', 'academics:enroll', 'records:read', 'records:manage', 'finance:read', 'finance:manage', 'cbt:read', 'cbt:manage', 'cbt:attempt', 'content:manage', 'media:manage', 'alumni:manage', 'reports:read'],
  bursar: ['finance:read', 'finance:manage'],
  registrar: ['academics:read', 'academics:manage', 'academics:enroll', 'records:read', 'records:manage'],
  teacher: ['academics:read', 'academics:enroll', 'records:read', 'records:manage', 'cbt:read', 'cbt:manage'],
  student: ['records:read', 'records:submit', 'cbt:read', 'cbt:attempt'],
  parent: [],
  alumni: ['alumni:manage']
};

export function hasIncompatibleRoleCombination(roleNames: string[]) {
  const staffRoles = new Set(['teacher', 'bursar', 'registrar', 'admin', 'super_admin']);
  return roleNames.includes('student') && roleNames.some((name) => staffRoles.has(name));
}

export async function syncDefaultRoles() {
  await Promise.all(Object.entries(defaultPermissions).map(([name, permissions]) =>
    Role.updateOne({ name }, { $set: { permissions }, $setOnInsert: { name } }, { upsert: true })
  ));
}
