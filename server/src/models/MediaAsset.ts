import { Schema, model } from 'mongoose';

const mediaAssetSchema = new Schema({
  key: { type: String, required: true, trim: true },
  url: { type: String, required: true },
  storageProvider: { type: String, required: true },
  publicId: String,
  altText: { type: String, required: true },
  section: String,
  version: { type: Number, required: true, default: 1 },
  isActive: { type: Boolean, default: true },
  uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

mediaAssetSchema.index({ key: 1, version: 1 }, { unique: true });
mediaAssetSchema.index({ key: 1, isActive: 1 });

export const MediaAsset = model('MediaAsset', mediaAssetSchema);
