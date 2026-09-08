import { Schema, model } from 'mongoose';

const gradeSchema = new Schema({
  assessmentId: { type: Schema.Types.ObjectId, ref: 'Assessment', required: true },
  studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
  score: { type: Number, required: true, min: 0 },
  grade: String,
  remarks: String,
  gradedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  gradedAt: { type: Date, default: Date.now }
}, { timestamps: true });

gradeSchema.index({ assessmentId: 1, studentId: 1 }, { unique: true });
export const Grade = model('Grade', gradeSchema);
