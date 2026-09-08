import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requirePermission } from '../middleware/auth.js';
import { AuditLog } from '../models/AuditLog.js';
import { Role } from '../models/Role.js';
import { User } from '../models/User.js';
import { writeAuditLog } from '../services/audit.js';
import type { AuthenticatedRequest } from '../types/auth.js';

const router = Router();
router.use(authenticate);

router.get('/audit-logs', requirePermission('audit:read'), async (request, response, next) => {
  try { response.json({ logs: await AuditLog.find().sort({ createdAt: -1 }).limit(100).lean() }); } catch (error) { next(error); }
});

router.patch('/users/:id/roles', requirePermission('roles:manage'), async (request: AuthenticatedRequest, response, next) => {
  try {
    const input = z.object({ roleIds: z.array(z.string()).min(1) }).parse(request.body);
    const [user, roles] = await Promise.all([User.findById(request.params.id), Role.find({ _id: { $in: input.roleIds } })]);
    if (!user || roles.length !== input.roleIds.length) { response.status(404).json({ error: 'User or role not found' }); return; }
    const before = user.roleIds.map(String);
    user.roleIds = roles.map((role) => role._id);
    await user.save();
    await writeAuditLog({ request, actorId: request.user!.id, action: 'user.roles_updated', entityType: 'User', entityId: user.id, before: { roleIds: before }, after: { roleIds: input.roleIds } });
    response.json({ userId: user.id, roleIds: input.roleIds });
  } catch (error) { next(error); }
});

export default router;
