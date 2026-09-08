import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { Role, defaultPermissions } from '../models/Role.js';
import { User } from '../models/User.js';
import { authenticate } from '../middleware/auth.js';
import { createAccessToken } from '../services/tokens.js';
import { writeAuditLog } from '../services/audit.js';
import type { AuthenticatedRequest } from '../types/auth.js';

const router = Router();
const credentialsSchema = z.object({ email: z.string().email(), password: z.string().min(8) });
const registrationSchema = credentialsSchema.extend({ firstName: z.string().min(1), lastName: z.string().min(1) });

async function getOrCreateRole(name: string) {
  return Role.findOneAndUpdate({ name }, { $setOnInsert: { name, permissions: defaultPermissions[name] ?? [] } }, { upsert: true, new: true });
}

router.post('/register', async (request, response, next) => {
  try {
    const input = registrationSchema.parse(request.body);
    const existing = await User.findOne({ email: input.email });
    if (existing) {
      response.status(409).json({ error: 'An account with that email already exists' });
      return;
    }
    const roleName = (await User.countDocuments()) === 0 ? 'super_admin' : 'student';
    const role = await getOrCreateRole(roleName);
    const user = await User.create({ ...input, email: input.email.toLowerCase(), passwordHash: await bcrypt.hash(input.password, 12), roleIds: [role._id] });
    const token = createAccessToken({ id: String(user._id), email: user.email, roleIds: [role._id] });
    await writeAuditLog({ request, actorId: String(user._id), action: 'user.registered', entityType: 'User', entityId: String(user._id), after: { email: user.email, role: roleName } });
    response.status(201).json({ token, user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: roleName } });
  } catch (error) { next(error); }
});

router.post('/login', async (request, response, next) => {
  try {
    const input = credentialsSchema.parse(request.body);
    const user = await User.findOne({ email: input.email.toLowerCase() }).select('+passwordHash');
    if (!user || user.status !== 'active' || !(await bcrypt.compare(input.password, user.passwordHash))) {
      response.status(401).json({ error: 'Invalid credentials' });
      return;
    }
    user.lastLoginAt = new Date();
    await user.save();
    const token = createAccessToken({ id: String(user._id), email: user.email, roleIds: user.roleIds });
    await writeAuditLog({ request, actorId: String(user._id), action: 'user.logged_in', entityType: 'User', entityId: String(user._id) });
    response.json({ token, user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName } });
  } catch (error) { next(error); }
});

router.get('/me', authenticate, async (request: AuthenticatedRequest, response, next) => {
  try {
    const user = await User.findById(request.user!.id).populate('roleIds', 'name permissions').lean();
    if (!user || user.status !== 'active') { response.status(401).json({ error: 'Account unavailable' }); return; }
    response.json({ user: { id: user._id, email: user.email, firstName: user.firstName, lastName: user.lastName, roles: user.roleIds } });
  } catch (error) { next(error); }
});

export default router;
