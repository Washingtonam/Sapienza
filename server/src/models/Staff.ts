import { Schema, model } from 'mongoose';

const staffSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  employeeNumber: { type: String, required: true, unique: true, uppercase: true, trim: true },
  department: String,
  jobTitle: { type: String, required: true, trim: true },
  employmentStatus: { type: String, enum: ['active', 'on_leave', 'ended'], default: 'active' },
  hireDate: Date
}, { timestamps: true });

export const Staff = model('Staff', staffSchema);
