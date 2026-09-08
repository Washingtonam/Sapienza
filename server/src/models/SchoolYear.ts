import { Schema, model } from 'mongoose';

const schoolYearSchema = new Schema({
  name: { type: String, required: true, unique: true, trim: true },
  startsAt: { type: Date, required: true },
  endsAt: { type: Date, required: true },
  status: { type: String, enum: ['planned', 'active', 'closed'], default: 'planned' }
}, { timestamps: true });

export const SchoolYear = model('SchoolYear', schoolYearSchema);
