import { Schema, model } from 'mongoose';

const cbtExamSchema = new Schema({
  title: { type: String, required: true, trim: true },
  instructions: String,
  subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
  classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true },
  durationMinutes: { type: Number, required: true, min: 1 },
  startsAt: { type: Date, required: true },
  endsAt: { type: Date, required: true },
  status: { type: String, enum: ['draft', 'scheduled', 'open', 'closed'], default: 'draft' },
  published: { type: Boolean, default: false }
}, { timestamps: true });

export const CbtExam = model('CbtExam', cbtExamSchema);
