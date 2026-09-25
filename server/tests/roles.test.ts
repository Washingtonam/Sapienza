import { describe, expect, it } from 'vitest';
import { defaultPermissions, hasIncompatibleRoleCombination } from '../src/models/Role.js';

describe('default role permissions', () => {
  it('keeps bursar and registrar access within their departments', () => {
    expect(defaultPermissions.bursar).toEqual(['finance:read', 'finance:manage']);
    expect(defaultPermissions.registrar).toContain('records:manage');
    expect(defaultPermissions.registrar).toContain('academics:enroll');
    expect(defaultPermissions.registrar).not.toContain('finance:read');
    expect(defaultPermissions.teacher).not.toContain('finance:manage');
    expect(defaultPermissions.student).not.toContain('finance:read');
    expect(defaultPermissions.student).not.toContain('academics:enroll');
  });

  it('reserves broad permissions for administrators', () => {
    expect(defaultPermissions.admin).toContain('users:manage');
    expect(defaultPermissions.super_admin).toContain('roles:manage');
    expect(defaultPermissions.bursar).not.toContain('users:manage');
    expect(defaultPermissions.teacher).not.toContain('users:manage');
  });

  it('allows teachers to enroll students without granting account or role administration', () => {
    expect(defaultPermissions.teacher).toContain('academics:enroll');
    expect(defaultPermissions.teacher).not.toContain('academics:manage');
    expect(defaultPermissions.teacher).not.toContain('users:manage');
    expect(defaultPermissions.student).not.toContain('academics:enroll');
  });

  it('allows multiple staff responsibilities but keeps student access separate', () => {
    expect(hasIncompatibleRoleCombination(['teacher', 'registrar'])).toBe(false);
    expect(hasIncompatibleRoleCombination(['student'])).toBe(false);
    expect(hasIncompatibleRoleCombination(['student', 'bursar'])).toBe(true);
    expect(hasIncompatibleRoleCombination(['student', 'admin'])).toBe(true);
  });
});