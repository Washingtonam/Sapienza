import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requirePermission } from '../middleware/auth.js';
import { AlumniPost } from '../models/AlumniPost.js';
import { AlumniProfile } from '../models/AlumniProfile.js';
import { ContentPage } from '../models/ContentPage.js';
import { MediaAsset } from '../models/MediaAsset.js';
import { Notice } from '../models/Notice.js';
import { writeAuditLog } from '../services/audit.js';
import type { AuthenticatedRequest } from '../types/auth.js';

const router = Router();
const noticeInput = z.object({ title: z.string().min(1), body: z.string().min(1), category: z.string().min(1), audience: z.enum(['public', 'students', 'parents', 'staff', 'alumni']).default('public'), publishAt: z.coerce.date(), expiresAt: z.coerce.date().optional(), status: z.enum(['draft', 'published', 'archived']).default('draft') });
const pageInput = z.object({ slug: z.string().min(1), title: z.string().min(1), sections: z.array(z.object({ key: z.string().min(1), heading: z.string().optional(), body: z.string().optional(), mediaKey: z.string().optional(), order: z.number().optional() })), status: z.enum(['draft', 'published']).default('draft') });
const mediaInput = z.object({ key: z.string().min(1), url: z.string().url(), storageProvider: z.string().min(1), publicId: z.string().optional(), altText: z.string().min(1), section: z.string().optional() });
const profileInput = z.object({ graduationYear: z.number().int().min(1900).max(2200), formerClass: z.string().optional(), currentOccupation: z.string().optional(), location: z.string().optional(), biography: z.string().optional(), visibility: z.enum(['public', 'members']).optional() });
const postInput = z.object({ title: z.string().min(1), body: z.string().min(1), status: z.enum(['draft', 'published']).default('draft') });

router.get('/notices', async (request, response, next) => {
  try {
    const now = new Date();
    response.json({ notices: await Notice.find({ audience: 'public', status: 'published', publishAt: { $lte: now }, $or: [{ expiresAt: { $exists: false } }, { expiresAt: { $gt: now } }] }).sort({ publishAt: -1 }).lean() });
  } catch (error) { next(error); }
});

router.get('/pages/:slug', async (request, response, next) => {
  try {
    const page = await ContentPage.findOne({ slug: request.params.slug, status: 'published' }).lean();
    if (!page) { response.status(404).json({ error: 'Page not found' }); return; }
    response.json({ page });
  } catch (error) { next(error); }
});

router.get('/media', async (_request, response, next) => {
  try { response.json({ media: await MediaAsset.find({ isActive: true }).sort({ key: 1, version: -1 }).lean() }); } catch (error) { next(error); }
});

router.get('/alumni/posts', async (_request, response, next) => {
  try { response.json({ posts: await AlumniPost.find({ status: 'published' }).populate('authorId', 'firstName lastName').sort({ publishedAt: -1 }).lean() }); } catch (error) { next(error); }
});

router.get('/alumni/profiles', async (_request, response, next) => {
  try { response.json({ profiles: await AlumniProfile.find({ visibility: 'public' }).populate('userId', 'firstName lastName').sort({ graduationYear: -1 }).lean() }); } catch (error) { next(error); }
});

router.post('/notices', authenticate, requirePermission('content:manage'), async (request: AuthenticatedRequest, response, next) => {
  try {
    const input = noticeInput.parse(request.body);
    if (input.expiresAt && input.expiresAt <= input.publishAt) { response.status(400).json({ error: 'Notice expiry must be after publication' }); return; }
    const notice = await Notice.create({ ...input, createdBy: request.user!.id });
    await writeAuditLog({ request, actorId: request.user!.id, action: 'notice.created', entityType: 'Notice', entityId: notice.id, after: notice.toObject() });
    response.status(201).json({ notice });
  } catch (error) { next(error); }
});

router.post('/pages', authenticate, requirePermission('content:manage'), async (request: AuthenticatedRequest, response, next) => {
  try {
    const input = pageInput.parse(request.body);
    const page = await ContentPage.findOneAndUpdate({ slug: input.slug }, { ...input, updatedBy: request.user!.id }, { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true });
    await writeAuditLog({ request, actorId: request.user!.id, action: 'content_page.updated', entityType: 'ContentPage', entityId: page!.id, after: page!.toObject() });
    response.json({ page });
  } catch (error) { next(error); }
});

router.post('/media', authenticate, requirePermission('media:manage'), async (request: AuthenticatedRequest, response, next) => {
  try {
    const input = mediaInput.parse(request.body);
    const previous = await MediaAsset.find({ key: input.key }).sort({ version: -1 }).limit(1).lean();
    const version = (previous[0]?.version ?? 0) + 1;
    await MediaAsset.updateMany({ key: input.key, isActive: true }, { $set: { isActive: false } });
    const media = await MediaAsset.create({ ...input, version, uploadedBy: request.user!.id, isActive: true });
    await writeAuditLog({ request, actorId: request.user!.id, action: 'media.replaced', entityType: 'MediaAsset', entityId: media.id, before: previous[0], after: media.toObject() });
    response.status(201).json({ media });
  } catch (error) { next(error); }
});

router.post('/media/:key/rollback/:version', authenticate, requirePermission('media:manage'), async (request: AuthenticatedRequest, response, next) => {
  try {
    const version = Number(request.params.version);
    if (!Number.isInteger(version) || version < 1) { response.status(400).json({ error: 'Invalid media version' }); return; }
    const target = await MediaAsset.findOne({ key: request.params.key, version }).lean();
    if (!target) { response.status(404).json({ error: 'Media version not found' }); return; }
    await MediaAsset.updateMany({ key: request.params.key }, { $set: { isActive: false } });
    await MediaAsset.updateOne({ _id: target._id }, { $set: { isActive: true } });
    await writeAuditLog({ request, actorId: request.user!.id, action: 'media.rolled_back', entityType: 'MediaAsset', entityId: String(target._id), after: { key: target.key, version } });
    response.json({ media: { ...target, isActive: true } });
  } catch (error) { next(error); }
});

router.use(authenticate);
router.get('/alumni/me', async (request: AuthenticatedRequest, response, next) => {
  try { response.json({ profile: await AlumniProfile.findOne({ userId: request.user!.id }).lean() }); } catch (error) { next(error); }
});

router.put('/alumni/me', async (request: AuthenticatedRequest, response, next) => {
  try {
    const input = profileInput.parse(request.body);
    const profile = await AlumniProfile.findOneAndUpdate({ userId: request.user!.id }, { ...input, userId: request.user!.id }, { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true });
    await writeAuditLog({ request, actorId: request.user!.id, action: 'alumni.profile_updated', entityType: 'AlumniProfile', entityId: profile!.id, after: profile!.toObject() });
    response.json({ profile });
  } catch (error) { next(error); }
});

router.post('/alumni/posts', requirePermission('alumni:manage'), async (request: AuthenticatedRequest, response, next) => {
  try {
    const input = postInput.parse(request.body);
    const post = await AlumniPost.create({ ...input, authorId: request.user!.id, publishedAt: input.status === 'published' ? new Date() : undefined });
    await writeAuditLog({ request, actorId: request.user!.id, action: 'alumni.post_created', entityType: 'AlumniPost', entityId: post.id, after: post.toObject() });
    response.status(201).json({ post });
  } catch (error) { next(error); }
});

export default router;
