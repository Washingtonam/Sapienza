import { Schema, model } from 'mongoose';

const assignmentSubmissionSchema = new Schema({
  assignmentId: { type: Schema.Types.ObjectId, ref: 'Assignment', required: true },
  studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
  submittedAt: Date,
  files: [{ name: String, url: String }],
  answerText: String,
  status: { type: String, enum: ['draft', 'submitted', 'late', 'graded'], default: 'draft' },
  grade: Number,
  feedback: String,
  gradedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  gradedAt: Date
}, { timestamps: true });

assignmentSubmissionSchema.index({ assignmentId: 1, studentId: 1 }, { unique: true });
export const AssignmentSubmission = model('AssignmentSubmission', assignmentSubmissionSchema);
