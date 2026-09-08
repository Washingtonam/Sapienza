import type { Request } from 'express';
import { AuditLog } from '../models/AuditLog.js';

export async function writeAuditLog(input: {
  request: Request;
  actorId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  before?: unknown;
  after?: unknown;
}) {
  await AuditLog.create({
    actorId: input.actorId,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    before: input.before,
    after: input.after,
    ipAddress: input.request.ip,
    userAgent: input.request.get('user-agent')
  });
}
