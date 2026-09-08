import { Schema, model } from 'mongoose';

const reportCardSchema = new Schema({
  studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
  schoolYearId: { type: Schema.Types.ObjectId, ref: 'SchoolYear', required: true },
  term: { type: String, required: true, trim: true },
  subjects: [{ subjectId: { type: Schema.Types.ObjectId, ref: 'Subject' }, subjectName: String, average: Number, grade: String }],
  average: { type: Number, required: true },
  position: Number,
  teacherComment: String,
  principalComment: String,
  publishedAt: Date,
  publishedBy: { type: Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

reportCardSchema.index({ studentId: 1, schoolYearId: 1, term: 1 }, { unique: true });
export const ReportCard = model('ReportCard', reportCardSchema);
