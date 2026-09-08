import { Schema, model } from 'mongoose';

const notificationSchema = new Schema({
  recipientId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, required: true, trim: true },
  title: { type: String, required: true, trim: true },
  message: { type: String, required: true },
  data: Schema.Types.Mixed,
  readAt: Date,
  deliveredAt: Date
}, { timestamps: true });

notificationSchema.index({ recipientId: 1, readAt: 1, createdAt: -1 });
export const Notification = model('Notification', notificationSchema);
