import { Schema, model } from 'mongoose';

const subjectSchema = new Schema({
  name: { type: String, required: true, trim: true },
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  description: String
}, { timestamps: true });

export const Subject = model('Subject', subjectSchema);
