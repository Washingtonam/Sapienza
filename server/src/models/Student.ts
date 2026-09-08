import { Schema, model } from 'mongoose';

const studentSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  admissionNumber: { type: String, required: true, unique: true, uppercase: true, trim: true },
  dateOfBirth: Date,
  gender: { type: String, enum: ['female', 'male', 'other', 'undisclosed'] },
  address: String,
  classId: { type: Schema.Types.ObjectId, ref: 'Class' },
  enrollmentStatus: { type: String, enum: ['active', 'withdrawn', 'graduated'], default: 'active' },
  admissionDate: { type: Date, required: true }
}, { timestamps: true });

export const Student = model('Student', studentSchema);
