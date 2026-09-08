import { Schema, model } from 'mongoose';

const invoiceSchema = new Schema({
  studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
  feeStructureId: { type: Schema.Types.ObjectId, ref: 'FeeStructure', required: true },
  amount: { type: Number, required: true, min: 0 },
  amountPaid: { type: Number, required: true, min: 0, default: 0 },
  balance: { type: Number, required: true, min: 0 },
  status: { type: String, enum: ['unpaid', 'partial', 'paid', 'overdue'], default: 'unpaid' },
  dueDate: { type: Date, required: true }
}, { timestamps: true });

invoiceSchema.index({ studentId: 1, feeStructureId: 1 }, { unique: true });
export const Invoice = model('Invoice', invoiceSchema);
