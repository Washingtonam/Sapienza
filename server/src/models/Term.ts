import { Schema, model } from 'mongoose';

const termSchema = new Schema({
  name: { type: String, required: true, trim: true },
  schoolYearId: { type: Schema.Types.ObjectId, ref: 'SchoolYear', required: true },
  order: { type: Number, required: true, min: 1, max: 3 },
  startsAt: Date,
  endsAt: Date
}, { timestamps: true });

termSchema.index({ schoolYearId: 1, name: 1 }, { unique: true });
termSchema.index({ schoolYearId: 1, order: 1 }, { unique: true });
export const Term = model('Term', termSchema);