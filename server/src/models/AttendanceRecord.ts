import { Schema, model } from 'mongoose';

const attendanceRecordSchema = new Schema({
  studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
  classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true },
  subjectId: { type: Schema.Types.ObjectId, ref: 'Subject' },
  date: { type: Date, required: true },
  status: { type: String, enum: ['present', 'absent', 'late', 'excused'], required: true },
  recordedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  remarks: String
}, { timestamps: true });

attendanceRecordSchema.index({ studentId: 1, subjectId: 1, date: 1 }, { unique: true });
export const AttendanceRecord = model('AttendanceRecord', attendanceRecordSchema);
