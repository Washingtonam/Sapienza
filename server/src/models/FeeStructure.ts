import { Schema, model } from 'mongoose';

const feeStructureSchema = new Schema({
  name: { type: String, required: true, trim: true },
  schoolYearId: { type: Schema.Types.ObjectId, ref: 'SchoolYear', required: true },
  classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true },
  items: [{ name: { type: String, required: true }, amount: { type: Number, required: true, min: 0 } }],
  totalAmount: { type: Number, required: true, min: 0 },
  dueDate: { type: Date, required: true }
}, { timestamps: true });

export const FeeStructure = model('FeeStructure', feeStructureSchema);
