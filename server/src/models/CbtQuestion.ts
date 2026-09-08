import { Schema, model } from 'mongoose';

const cbtQuestionSchema = new Schema({
  examId: { type: Schema.Types.ObjectId, ref: 'CbtExam', required: true },
  questionText: { type: String, required: true },
  type: { type: String, enum: ['multiple_choice', 'true_false', 'short_answer'], required: true },
  options: [{ type: String }],
  correctAnswer: { type: String, required: true, select: false },
  points: { type: Number, required: true, min: 1 },
  order: { type: Number, required: true, min: 1 }
}, { timestamps: true });

cbtQuestionSchema.index({ examId: 1, order: 1 }, { unique: true });
export const CbtQuestion = model('CbtQuestion', cbtQuestionSchema);
