import { Schema, model } from 'mongoose';

const alumniProfileSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  graduationYear: { type: Number, required: true },
  formerClass: String,
  currentOccupation: String,
  location: String,
  biography: String,
  visibility: { type: String, enum: ['public', 'members'], default: 'members' }
}, { timestamps: true });

export const AlumniProfile = model('AlumniProfile', alumniProfileSchema);
