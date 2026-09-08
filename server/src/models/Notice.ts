import { Schema, model } from 'mongoose';

const noticeSchema = new Schema({
  title: { type: String, required: true, trim: true },
  body: { type: String, required: true },
  category: { type: String, required: true, trim: true },
  audience: { type: String, enum: ['public', 'students', 'parents', 'staff', 'alumni'], default: 'public' },
  publishAt: { type: Date, required: true },
  expiresAt: Date,
  status: { type: String, enum: ['draft', 'published', 'archived'], default: 'draft' },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

noticeSchema.index({ status: 1, publishAt: -1, expiresAt: 1 });
export const Notice = model('Notice', noticeSchema);
