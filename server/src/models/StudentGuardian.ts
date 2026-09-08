import { Schema, model } from 'mongoose';

const studentGuardianSchema = new Schema({
  studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
  guardianId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  relationship: { type: String, required: true, trim: true },
  isPrimaryContact: { type: Boolean, default: false }
}, { timestamps: true });

studentGuardianSchema.index({ studentId: 1, guardianId: 1 }, { unique: true });
export const StudentGuardian = model('StudentGuardian', studentGuardianSchema);
