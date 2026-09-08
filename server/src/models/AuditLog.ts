import { Schema, model } from 'mongoose';

const auditLogSchema = new Schema({
  actorId: { type: Schema.Types.ObjectId, ref: 'User' },
  action: { type: String, required: true },
  entityType: { type: String, required: true },
  entityId: String,
  before: Schema.Types.Mixed,
  after: Schema.Types.Mixed,
  ipAddress: String,
  userAgent: String
}, { timestamps: true });

auditLogSchema.index({ actorId: 1, createdAt: -1 });
auditLogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });

export const AuditLog = model('AuditLog', auditLogSchema);
