import { Schema, model } from 'mongoose';

const paymentSchema = new Schema({
  invoiceId: { type: Schema.Types.ObjectId, ref: 'Invoice', required: true },
  studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
  amount: { type: Number, required: true, min: 0 },
  provider: { type: String, required: true },
  transactionReference: { type: String, required: true, unique: true },
  status: { type: String, enum: ['pending', 'successful', 'failed', 'refunded'], default: 'pending' },
  paidAt: Date,
  metadata: Schema.Types.Mixed
}, { timestamps: true });

paymentSchema.index({ invoiceId: 1, createdAt: -1 });
export const Payment = model('Payment', paymentSchema);
