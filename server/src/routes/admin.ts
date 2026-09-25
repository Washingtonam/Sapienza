import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { authenticate, requirePermission } from '../middleware/auth.js';
import { AuditLog } from '../models/AuditLog.js';
import { hasIncompatibleRoleCombination, Role } from '../models/Role.js';
import { User } from '../models/User.js';
import { Staff } from '../models/Staff.js';
import { writeAuditLog } from '../services/audit.js';
import type { AuthenticatedRequest } from '../types/auth.js';

const router = Router();
router.use(authenticate);

router.get('/audit-logs', requirePermission('audit:read'), async (request, response, next) => {
  try { response.json({ logs: await AuditLog.find().sort({ createdAt: -1 }).limit(100).lean() }); } catch (error) { next(error); }
});

router.get('/users', requirePermission('users:read'), async (_request, response, next) => {
  try {
    const users = await User.find().select('firstName lastName email loginCode status roleIds').populate('roleIds', 'name').sort({ lastName: 1, firstName: 1 }).lean();
    response.json({ users });
  } catch (error) { next(error); }
});

router.post('/users/staff', requirePermission('users:manage'), async (request: AuthenticatedRequest, response, next) => {
  let userId: string | undefined;
  try {
    const input = z.object({
      firstName: z.string().trim().min(1),
      lastName: z.string().trim().min(1),
      email: z.string().email(),
      password: z.string().min(8),
      roleName: z.enum(['teacher', 'bursar', 'registrar']),
      employeeNumber: z.string().trim().min(1),
      jobTitle: z.string().trim().min(1),
      department: z.string().trim().optional(),
      hireDate: z.coerce.date().optional()
    }).parse(request.body);
    const [existing, role] = await Promise.all([
      User.findOne({ email: input.email.toLowerCase() }).select('_id'),
      Role.findOne({ name: input.roleName }).select('_id')
    ]);
    if (existing) { response.status(409).json({ error: 'An account with that email already exists' }); return; }
    if (!role) { response.status(500).json({ error: 'Staff role is not configured' }); return; }
    const user = await User.create({
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email.toLowerCase(),
      passwordHash: await bcrypt.hash(input.password, 12),
      roleIds: [role._id]
    });
    userId = user.id;
    const staff = await Staff.create({ userId: user._id, employeeNumber: input.employeeNumber, jobTitle: input.jobTitle, department: input.department, hireDate: input.hireDate });
    await writeAuditLog({ request, actorId: request.user!.id, action: 'staff.account_created', entityType: 'Staff', entityId: staff.id, after: { userId: user.id, email: user.email, role: input.roleName, employeeNumber: staff.employeeNumber, jobTitle: staff.jobTitle } });
    response.status(201).json({ user: { id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email }, staff });
  } catch (error) {
    if (userId) {
      await Staff.deleteOne({ userId });
      await User.findByIdAndDelete(userId);
    }
    next(error);
  }
});

router.get('/roles', requirePermission('users:read'), async (request: AuthenticatedRequest, response, next) => {
  try {
    const actorRoles = await Role.find({ _id: { $in: request.user!.roleIds } }).select('name').lean();
    const isSuperAdmin = actorRoles.some((role) => role.name === 'super_admin');
    const roles = await Role.find(isSuperAdmin ? {} : { name: { $ne: 'super_admin' } }).select('name permissions').sort({ name: 1 }).lean();
    response.json({ roles });
  } catch (error) { next(error); }
});

router.patch('/users/:id/roles', requirePermission('users:manage'), async (request: AuthenticatedRequest, response, next) => {
  try {
    const input = z.object({ roleIds: z.array(z.string()).min(1) }).parse(request.body);
    const [user, roles] = await Promise.all([User.findById(request.params.id), Role.find({ _id: { $in: input.roleIds } })]);
    if (!user || roles.length !== input.roleIds.length) { response.status(404).json({ error: 'User or role not found' }); return; }
    const actorRoles = await Role.find({ _id: { $in: request.user!.roleIds } }).select('name').lean();
    const isSuperAdmin = actorRoles.some((role) => role.name === 'super_admin');
    if (!isSuperAdmin && roles.some((role) => role.name === 'super_admin')) { response.status(403).json({ error: 'Only a super admin can assign the super admin role' }); return; }
    if (hasIncompatibleRoleCombination(roles.map((role) => role.name))) {
      response.status(400).json({ error: 'Student and staff roles cannot be assigned to the same account' });
      return;
    }
    const before = user.roleIds.map(String);
    user.roleIds = roles.map((role) => role._id);
    await user.save();
    await writeAuditLog({ request, actorId: request.user!.id, action: 'user.roles_updated', entityType: 'User', entityId: user.id, before: { roleIds: before }, after: { roleIds: input.roleIds } });
    response.json({ userId: user.id, roleIds: input.roleIds });
  } catch (error) { next(error); }
});

export default router;
