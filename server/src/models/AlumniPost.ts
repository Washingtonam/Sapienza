import { Schema, model } from 'mongoose';

const alumniPostSchema = new Schema({
  authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true, trim: true },
  body: { type: String, required: true },
  status: { type: String, enum: ['draft', 'published', 'archived'], default: 'draft' },
  publishedAt: Date
}, { timestamps: true });

alumniPostSchema.index({ status: 1, publishedAt: -1 });
export const AlumniPost = model('AlumniPost', alumniPostSchema);
