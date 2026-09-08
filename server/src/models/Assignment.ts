import { Schema, model } from 'mongoose';

const assignmentSchema = new Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
  classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true },
  teacherId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  dueAt: { type: Date, required: true },
  attachments: [{ name: String, url: String }],
  status: { type: String, enum: ['draft', 'published', 'closed'], default: 'draft' }
}, { timestamps: true });

export const Assignment = model('Assignment', assignmentSchema);
