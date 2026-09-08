import { createHmac, timingSafeEqual } from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import { env } from '../config/env.js';
import { authenticate, requirePermission } from '../middleware/auth.js';
import { FeeStructure } from '../models/FeeStructure.js';
import { Invoice } from '../models/Invoice.js';
import { Payment } from '../models/Payment.js';
import { Student } from '../models/Student.js';
import { StudentGuardian } from '../models/StudentGuardian.js';
import { writeAuditLog } from '../services/audit.js';
import type { AuthenticatedRequest } from '../types/auth.js';

const router = Router();
const feeInput = z.object({ name: z.string().min(1), schoolYearId: z.string(), classId: z.string(), items: z.array(z.object({ name: z.string().min(1), amount: z.number().nonnegative() })).min(1), dueDate: z.coerce.date() });
const invoiceInput = z.object({ studentId: z.string(), feeStructureId: z.string() });
const paymentInput = z.object({ invoiceId: z.string(), amount: z.number().positive(), provider: z.string().min(1) });
const webhookInput = z.object({ transactionReference: z.string().min(1), status: z.enum(['successful', 'failed', 'refunded']), paidAt: z.coerce.date().optional(), metadata: z.unknown().optional() });

function verifyWebhookSignature(payload: string, signature: string | undefined) {
  if (!signature) return false;
  const expected = createHmac('sha256', env.PAYMENT_WEBHOOK_SECRET).update(payload).digest('hex');
  const actualBuffer = Buffer.from(signature, 'utf8');
  const expectedBuffer = Buffer.from(expected, 'utf8');
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}

async function accessibleStudentIds(userId: string) {
  const [owned, guardianships] = await Promise.all([Student.find({ userId }).select('_id').lean(), StudentGuardian.find({ guardianId: userId }).select('studentId').lean()]);
  return [...owned.map((student) => student._id), ...guardianships.map((link) => link.studentId)];
}

router.get('/fee-structures', authenticate, requirePermission('finance:read'), async (_request, response, next) => {
  try { response.json({ feeStructures: await FeeStructure.find().sort({ createdAt: -1 }).lean() }); } catch (error) { next(error); }
});

router.post('/fee-structures', authenticate, requirePermission('finance:manage'), async (request: AuthenticatedRequest, response, next) => {
  try {
    const input = feeInput.parse(request.body);
    const totalAmount = input.items.reduce((total, item) => total + item.amount, 0);
    const feeStructure = await FeeStructure.create({ ...input, totalAmount });
    await writeAuditLog({ request, actorId: request.user!.id, action: 'fee_structure.created', entityType: 'FeeStructure', entityId: feeStructure.id, after: feeStructure.toObject() });
    response.status(201).json({ feeStructure });
  } catch (error) { next(error); }
});

router.get('/invoices', authenticate, requirePermission('finance:read'), async (_request, response, next) => {
  try { response.json({ invoices: await Invoice.find().populate('studentId').populate('feeStructureId').sort({ dueDate: 1 }).lean() }); } catch (error) { next(error); }
});

router.get('/my-invoices', authenticate, async (request: AuthenticatedRequest, response, next) => {
  try { response.json({ invoices: await Invoice.find({ studentId: { $in: await accessibleStudentIds(request.user!.id) } }).populate('feeStructureId').sort({ dueDate: 1 }).lean() }); } catch (error) { next(error); }
});

router.post('/invoices', authenticate, requirePermission('finance:manage'), async (request: AuthenticatedRequest, response, next) => {
  try {
    const input = invoiceInput.parse(request.body);
    const feeStructure = await FeeStructure.findById(input.feeStructureId).select('totalAmount dueDate');
    if (!feeStructure) { response.status(404).json({ error: 'Fee structure not found' }); return; }
    const invoice = await Invoice.create({ ...input, amount: feeStructure.totalAmount, amountPaid: 0, balance: feeStructure.totalAmount, dueDate: feeStructure.dueDate });
    await writeAuditLog({ request, actorId: request.user!.id, action: 'invoice.created', entityType: 'Invoice', entityId: invoice.id, after: invoice.toObject() });
    response.status(201).json({ invoice });
  } catch (error) { next(error); }
});

router.post('/payments', authenticate, async (request: AuthenticatedRequest, response, next) => {
  try {
    const input = paymentInput.parse(request.body);
    const invoice = await Invoice.findById(input.invoiceId).select('studentId balance status');
    if (!invoice) { response.status(404).json({ error: 'Invoice not found' }); return; }
    const permittedStudents = (await accessibleStudentIds(request.user!.id)).map(String);
    if (!permittedStudents.includes(String(invoice.studentId))) { response.status(403).json({ error: 'You cannot pay this invoice' }); return; }
    if (invoice.status === 'paid' || input.amount > invoice.balance) { response.status(400).json({ error: 'Payment amount exceeds the invoice balance' }); return; }
    const transactionReference = `SAPIENZA-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const payment = await Payment.create({ invoiceId: invoice._id, studentId: invoice.studentId, amount: input.amount, provider: input.provider, transactionReference });
    await writeAuditLog({ request, actorId: request.user!.id, action: 'payment.initiated', entityType: 'Payment', entityId: payment.id, after: { invoiceId: invoice.id, amount: input.amount, provider: input.provider, transactionReference } });
    response.status(201).json({ payment, message: 'Payment initiated. Await provider confirmation.' });
  } catch (error) { next(error); }
});

router.post('/webhooks/payment', async (request, response, next) => {
  try {
    const rawPayload = JSON.stringify(request.body);
    if (!verifyWebhookSignature(rawPayload, request.header('x-webhook-signature'))) { response.status(401).json({ error: 'Invalid webhook signature' }); return; }
    const input = webhookInput.parse(request.body);
    const payment = await Payment.findOne({ transactionReference: input.transactionReference });
    if (!payment) { response.status(404).json({ error: 'Payment not found' }); return; }
    if (payment.status === input.status) { response.json({ received: true, duplicate: true }); return; }
    const previousStatus = payment.status;
    payment.status = input.status;
    payment.paidAt = input.status === 'successful' ? input.paidAt ?? new Date() : undefined;
    payment.metadata = input.metadata;
    await payment.save();
    if (input.status === 'successful' || previousStatus === 'successful') {
      const invoice = await Invoice.findById(payment.invoiceId);
      if (invoice) {
        if (input.status === 'successful' && previousStatus !== 'successful') invoice.amountPaid = Math.min(invoice.amount, invoice.amountPaid + payment.amount);
        if (input.status === 'refunded' && previousStatus === 'successful') invoice.amountPaid = Math.max(0, invoice.amountPaid - payment.amount);
        invoice.balance = invoice.amount - invoice.amountPaid;
        invoice.status = invoice.balance === 0 ? 'paid' : invoice.amountPaid === 0 ? 'unpaid' : 'partial';
        await invoice.save();
      }
    }
    response.json({ received: true });
  } catch (error) { next(error); }
});

export default router;
