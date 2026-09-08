import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requirePermission } from '../middleware/auth.js';
import { CbtAttempt } from '../models/CbtAttempt.js';
import { CbtExam } from '../models/CbtExam.js';
import { CbtQuestion } from '../models/CbtQuestion.js';
import { Student } from '../models/Student.js';
import { writeAuditLog } from '../services/audit.js';
import type { AuthenticatedRequest } from '../types/auth.js';

const router = Router();
router.use(authenticate);

const examInput = z.object({ title: z.string().min(1), instructions: z.string().optional(), subjectId: z.string(), classId: z.string(), durationMinutes: z.number().int().positive(), startsAt: z.coerce.date(), endsAt: z.coerce.date(), status: z.enum(['draft', 'scheduled', 'open', 'closed']).optional(), published: z.boolean().optional() });
const questionInput = z.object({ questionText: z.string().min(1), type: z.enum(['multiple_choice', 'true_false', 'short_answer']), options: z.array(z.string().min(1)).optional(), correctAnswer: z.string().min(1), points: z.number().int().positive(), order: z.number().int().positive() });
const answerInput = z.object({ questionId: z.string(), answer: z.string().optional() });

function sanitizeQuestion(question: { _id: unknown; questionText: string; type: string; options?: string[]; points: number; order: number }) {
  return { id: question._id, questionText: question.questionText, type: question.type, options: question.options ?? [], points: question.points, order: question.order };
}

async function currentStudent(userId: string) {
  return Student.findOne({ userId }).select('_id classId').lean();
}

router.get('/exams', requirePermission('cbt:read'), async (request, response, next) => {
  try {
    const exams = await CbtExam.find(request.query.classId ? { classId: request.query.classId } : {}).populate('subjectId', 'name code').sort({ startsAt: -1 }).lean();
    response.json({ exams });
  } catch (error) { next(error); }
});

router.post('/exams', requirePermission('cbt:manage'), async (request: AuthenticatedRequest, response, next) => {
  try {
    const input = examInput.parse(request.body);
    if (input.endsAt <= input.startsAt) { response.status(400).json({ error: 'The exam must end after it starts' }); return; }
    const exam = await CbtExam.create(input);
    await writeAuditLog({ request, actorId: request.user!.id, action: 'cbt_exam.created', entityType: 'CbtExam', entityId: exam.id, after: input });
    response.status(201).json({ exam });
  } catch (error) { next(error); }
});

router.post('/exams/:examId/questions', requirePermission('cbt:manage'), async (request: AuthenticatedRequest, response, next) => {
  try {
    const input = questionInput.parse(request.body);
    if (input.type === 'multiple_choice' && (!input.options || input.options.length < 2)) { response.status(400).json({ error: 'Multiple-choice questions require at least two options' }); return; }
    if (input.type === 'true_false' && (!input.options || input.options.length !== 2)) { response.status(400).json({ error: 'True/false questions require two options' }); return; }
    const exam = await CbtExam.findById(request.params.examId).select('_id');
    if (!exam) { response.status(404).json({ error: 'Exam not found' }); return; }
    const question = await CbtQuestion.create({ ...input, examId: exam._id });
    await writeAuditLog({ request, actorId: request.user!.id, action: 'cbt_question.created', entityType: 'CbtQuestion', entityId: question.id, after: { ...input, examId: exam.id } });
    response.status(201).json({ question: sanitizeQuestion(question) });
  } catch (error) { next(error); }
});

router.get('/exams/:examId/questions', requirePermission('cbt:read'), async (request, response, next) => {
  try {
    const exam = await CbtExam.findById(request.params.examId).select('title instructions durationMinutes startsAt endsAt status classId published').lean();
    if (!exam) { response.status(404).json({ error: 'Exam not found' }); return; }
    const student = await currentStudent(request.user!.id);
    if (student) {
      const now = new Date();
      if (String(exam.classId) !== String(student.classId) || !exam.published || exam.status === 'draft' || exam.status === 'closed' || now < exam.startsAt || now > exam.endsAt) {
        response.status(403).json({ error: 'This exam is not available to you' });
        return;
      }
    }
    const questions = await CbtQuestion.find({ examId: exam._id }).sort({ order: 1 }).lean();
    response.json({ exam, questions: questions.map(sanitizeQuestion) });
  } catch (error) { next(error); }
});

router.post('/exams/:examId/start', requirePermission('cbt:attempt'), async (request: AuthenticatedRequest, response, next) => {
  try {
    const [exam, student] = await Promise.all([CbtExam.findById(request.params.examId).lean(), currentStudent(request.user!.id)]);
    if (!exam || !student) { response.status(404).json({ error: 'Exam or student profile not found' }); return; }
    if (String(exam.classId) !== String(student.classId)) { response.status(403).json({ error: 'This exam is not assigned to your class' }); return; }
    const now = new Date();
    if (exam.status === 'draft' || exam.status === 'closed' || !exam.published || now < exam.startsAt || now > exam.endsAt) { response.status(400).json({ error: 'This exam is not currently available' }); return; }
    const existing = await CbtAttempt.findOne({ examId: exam._id, studentId: student._id });
    if (existing) { response.json({ attempt: { id: existing.id, startedAt: existing.startedAt, status: existing.status } }); return; }
    const attempt = await CbtAttempt.create({ examId: exam._id, studentId: student._id, startedAt: now });
    await writeAuditLog({ request, actorId: request.user!.id, action: 'cbt_attempt.started', entityType: 'CbtAttempt', entityId: attempt.id, after: { examId: exam.id, studentId: student.id } });
    response.status(201).json({ attempt: { id: attempt.id, startedAt: attempt.startedAt, status: attempt.status } });
  } catch (error) { next(error); }
});

router.post('/attempts/:attemptId/submit', requirePermission('cbt:attempt'), async (request: AuthenticatedRequest, response, next) => {
  try {
    const input = z.object({ answers: z.array(answerInput) }).parse(request.body);
    const student = await currentStudent(request.user!.id);
    const attempt = await CbtAttempt.findById(request.params.attemptId);
    if (!attempt || !student || String(attempt.studentId) !== String(student._id)) { response.status(404).json({ error: 'Attempt not found' }); return; }
    if (attempt.status !== 'in_progress') { response.status(400).json({ error: 'This attempt has already been submitted' }); return; }
    const exam = await CbtExam.findById(attempt.examId).select('durationMinutes endsAt');
    if (!exam) { response.status(404).json({ error: 'Exam not found' }); return; }
    const now = new Date();
    const expired = now.getTime() > attempt.startedAt.getTime() + exam.durationMinutes * 60000 || now > exam.endsAt;
    const questions = await CbtQuestion.find({ examId: exam._id }).select('+correctAnswer').lean();
    const answerMap = new Map(input.answers.map((answer) => [answer.questionId, answer.answer?.trim() ?? '']));
    const answers = questions.map((question) => {
      const answer = answerMap.get(String(question._id)) ?? '';
      const isCorrect = answer.localeCompare(question.correctAnswer.trim(), undefined, { sensitivity: 'accent' }) === 0;
      return { questionId: question._id, answer, isCorrect, pointsAwarded: isCorrect ? question.points : 0 };
    });
    const maxScore = questions.reduce((total, question) => total + question.points, 0);
    const score = answers.reduce((total, answer) => total + answer.pointsAwarded, 0);
    attempt.answers = answers;
    attempt.score = score;
    attempt.maxScore = maxScore;
    attempt.percentage = maxScore ? Math.round(score / maxScore * 10000) / 100 : 0;
    attempt.submittedAt = now;
    attempt.status = expired ? 'expired' : 'submitted';
    await attempt.save();
    await writeAuditLog({ request, actorId: request.user!.id, action: expired ? 'cbt_attempt.expired' : 'cbt_attempt.submitted', entityType: 'CbtAttempt', entityId: attempt.id, after: { score, maxScore, percentage: attempt.percentage, status: attempt.status } });
    response.json({ result: { attemptId: attempt.id, score, maxScore, percentage: attempt.percentage, status: attempt.status, submittedAt: attempt.submittedAt } });
  } catch (error) { next(error); }
});

router.get('/exams/:examId/results', requirePermission('cbt:manage'), async (request, response, next) => {
  try { response.json({ results: await CbtAttempt.find({ examId: request.params.examId }).populate('studentId').sort({ percentage: -1 }).lean() }); } catch (error) { next(error); }
});

router.get('/my-results', requirePermission('cbt:attempt'), async (request: AuthenticatedRequest, response, next) => {
  try {
    const student = await currentStudent(request.user!.id);
    if (!student) { response.status(404).json({ error: 'Student profile not found' }); return; }
    response.json({ results: await CbtAttempt.find({ studentId: student._id }).populate('examId', 'title subjectId').sort({ createdAt: -1 }).lean() });
  } catch (error) { next(error); }
});

export default router;
