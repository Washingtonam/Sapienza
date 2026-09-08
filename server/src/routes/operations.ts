import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requirePermission } from '../middleware/auth.js';
import { AttendanceRecord } from '../models/AttendanceRecord.js';
import { CbtAttempt } from '../models/CbtAttempt.js';
import { Invoice } from '../models/Invoice.js';
import { Notification } from '../models/Notification.js';
import { Student } from '../models/Student.js';
import { User } from '../models/User.js';
import { createNotification } from '../services/notifications.js';
import type { AuthenticatedRequest } from '../types/auth.js';

const router = Router();
router.use(authenticate);

const notificationInput = z.object({ recipientId: z.string(), type: z.string().min(1), title: z.string().min(1), message: z.string().min(1), data: z.unknown().optional() });

function csvEscape(value: unknown) {
  const text = value === null || value === undefined ? '' : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

function csvResponse(response: import('express').Response, filename: string, headers: string[], rows: unknown[][]) {
  const csv = [headers, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n');
  response.setHeader('Content-Type', 'text/csv; charset=utf-8');
  response.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  response.send(csv);
}

router.get('/notifications', async (request: AuthenticatedRequest, response, next) => {
  try {
    const unreadOnly = request.query.unread === 'true';
    const filter = { recipientId: request.user!.id, ...(unreadOnly ? { readAt: { $exists: false } } : {}) };
    response.json({ notifications: await Notification.find(filter).sort({ createdAt: -1 }).limit(100).lean() });
  } catch (error) { next(error); }
});

router.patch('/notifications/:id/read', async (request: AuthenticatedRequest, response, next) => {
  try {
    const notification = await Notification.findOneAndUpdate({ _id: request.params.id, recipientId: request.user!.id }, { readAt: new Date() }, { new: true }).lean();
    if (!notification) { response.status(404).json({ error: 'Notification not found' }); return; }
    response.json({ notification });
  } catch (error) { next(error); }
});

router.post('/notifications', requirePermission('users:manage'), async (request: AuthenticatedRequest, response, next) => {
  try {
    const input = notificationInput.parse(request.body);
    const recipient = await User.findById(input.recipientId).select('_id');
    if (!recipient) { response.status(404).json({ error: 'Recipient not found' }); return; }
    response.status(201).json({ notification: await createNotification(input) });
  } catch (error) { next(error); }
});

router.get('/dashboard', requirePermission('reports:read'), async (_request, response, next) => {
  try {
    const [students, attendance, invoices, payments, attempts] = await Promise.all([
      Student.countDocuments({ enrollmentStatus: 'active' }),
      AttendanceRecord.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Invoice.aggregate([{ $group: { _id: '$status', count: { $sum: 1 }, balance: { $sum: '$balance' } } }]),
      Invoice.aggregate([{ $group: { _id: null, billed: { $sum: '$amount' }, collected: { $sum: '$amountPaid' }, outstanding: { $sum: '$balance' } } }]),
      CbtAttempt.aggregate([{ $match: { status: { $in: ['submitted', 'expired'] } } }, { $group: { _id: null, attempts: { $sum: 1 }, averagePercentage: { $avg: '$percentage' } } }])
    ]);
    response.json({ students, attendance, invoices, finance: payments[0] ?? { billed: 0, collected: 0, outstanding: 0 }, cbt: attempts[0] ?? { attempts: 0, averagePercentage: 0 } });
  } catch (error) { next(error); }
});

router.get('/exports/attendance.csv', requirePermission('reports:read'), async (_request, response, next) => {
  try {
    const records = await AttendanceRecord.find().populate('studentId', 'admissionNumber userId').lean();
    csvResponse(response, 'attendance.csv', ['Student', 'Date', 'Status', 'Class', 'Subject'], records.map((record) => [record.studentId, record.date.toISOString(), record.status, record.classId, record.subjectId]));
  } catch (error) { next(error); }
});

router.get('/exports/invoices.csv', requirePermission('reports:read'), async (_request, response, next) => {
  try {
    const invoices = await Invoice.find().lean();
    csvResponse(response, 'invoices.csv', ['Invoice', 'Student', 'Amount', 'Paid', 'Balance', 'Status', 'Due date'], invoices.map((invoice) => [invoice.id, invoice.studentId, invoice.amount, invoice.amountPaid, invoice.balance, invoice.status, invoice.dueDate.toISOString()]));
  } catch (error) { next(error); }
});

router.get('/exports/cbt-results.csv', requirePermission('reports:read'), async (_request, response, next) => {
  try {
    const attempts = await CbtAttempt.find({ status: { $in: ['submitted', 'expired'] } }).lean();
    csvResponse(response, 'cbt-results.csv', ['Exam', 'Student', 'Score', 'Maximum', 'Percentage', 'Status'], attempts.map((attempt) => [attempt.examId, attempt.studentId, attempt.score, attempt.maxScore, attempt.percentage, attempt.status]));
  } catch (error) { next(error); }
});

export default router;
