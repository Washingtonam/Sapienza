import { Schema, model } from 'mongoose';

const userSchema = new Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  loginCode: { type: String, unique: true, sparse: true, uppercase: true, trim: true },
  passwordHash: { type: String, required: true, select: false },
  firstName: { type: String, required: true, trim: true },
  middleName: { type: String, trim: true },
  lastName: { type: String, required: true, trim: true },
  status: { type: String, enum: ['active', 'suspended', 'archived'], default: 'active' },
  roleIds: [{ type: Schema.Types.ObjectId, ref: 'Role', required: true }],
  lastLoginAt: Date
}, { timestamps: true });

export const User = model('User', userSchema);
