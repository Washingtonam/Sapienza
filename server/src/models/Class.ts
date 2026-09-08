import { Schema, model } from 'mongoose';

const classSchema = new Schema({
  name: { type: String, required: true, trim: true },
  level: { type: String, required: true, trim: true },
  schoolYearId: { type: Schema.Types.ObjectId, ref: 'SchoolYear', required: true },
  classTeacherId: { type: Schema.Types.ObjectId, ref: 'Staff' }
}, { timestamps: true });

classSchema.index({ name: 1, schoolYearId: 1 }, { unique: true });
export const SchoolClass = model('Class', classSchema);
