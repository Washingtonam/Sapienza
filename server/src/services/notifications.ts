import type { Types } from 'mongoose';
import { Notification } from '../models/Notification.js';

export async function createNotification(input: {
  recipientId: Types.ObjectId | string;
  type: string;
  title: string;
  message: string;
  data?: unknown;
}) {
  return Notification.create({ ...input, deliveredAt: new Date() });
}
