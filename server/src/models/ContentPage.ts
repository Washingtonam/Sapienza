import { Schema, model } from 'mongoose';

const contentPageSchema = new Schema({
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
  title: { type: String, required: true, trim: true },
  sections: [{ key: { type: String, required: true }, heading: String, body: String, mediaKey: String, order: Number }],
  status: { type: String, enum: ['draft', 'published'], default: 'draft' },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

export const ContentPage = model('ContentPage', contentPageSchema);
