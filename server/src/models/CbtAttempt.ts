import { Schema, model } from 'mongoose';

const cbtAttemptSchema = new Schema({
  examId: { type: Schema.Types.ObjectId, ref: 'CbtExam', required: true },
  studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
  startedAt: { type: Date, required: true },
  submittedAt: Date,
  answers: [{ questionId: { type: Schema.Types.ObjectId, ref: 'CbtQuestion' }, answer: String, isCorrect: Boolean, pointsAwarded: Number }],
  score: { type: Number, min: 0 },
  maxScore: { type: Number, min: 0 },
  percentage: { type: Number, min: 0, max: 100 },
  status: { type: String, enum: ['in_progress', 'submitted', 'expired'], default: 'in_progress' }
}, { timestamps: true });

cbtAttemptSchema.index({ examId: 1, studentId: 1 }, { unique: true });
export const CbtAttempt = model('CbtAttempt', cbtAttemptSchema);
