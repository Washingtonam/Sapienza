import { Schema, model } from 'mongoose';

const assessmentSchema = new Schema({
  title: { type: String, required: true, trim: true },
  type: { type: String, enum: ['test', 'exam', 'project', 'assignment'], required: true },
  subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
  classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true },
  schoolYearId: { type: Schema.Types.ObjectId, ref: 'SchoolYear', required: true },
  term: { type: String, required: true, trim: true },
  maxScore: { type: Number, required: true, min: 1 },
  published: { type: Boolean, default: false }
}, { timestamps: true });

export const Assessment = model('Assessment', assessmentSchema);
