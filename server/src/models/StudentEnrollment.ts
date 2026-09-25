import { Schema, model } from 'mongoose';

const studentEnrollmentSchema = new Schema({
  studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
  schoolYearId: { type: Schema.Types.ObjectId, ref: 'SchoolYear', required: true },
  termId: { type: Schema.Types.ObjectId, ref: 'Term', required: true },
  classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true },
  enrolledAt: { type: Date, required: true, default: Date.now },
  registeredBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

studentEnrollmentSchema.index({ studentId: 1, schoolYearId: 1 }, { unique: true });
studentEnrollmentSchema.index({ classId: 1, schoolYearId: 1 });

export const StudentEnrollment = model('StudentEnrollment', studentEnrollmentSchema);