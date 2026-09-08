import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requirePermission } from '../middleware/auth.js';
import { AttendanceRecord } from '../models/AttendanceRecord.js';
import { Assignment } from '../models/Assignment.js';
import { AssignmentSubmission } from '../models/AssignmentSubmission.js';
import { Assessment } from '../models/Assessment.js';
import { Grade } from '../models/Grade.js';
import { ReportCard } from '../models/ReportCard.js';
import { Student } from '../models/Student.js';
import { Subject } from '../models/Subject.js';
import { writeAuditLog } from '../services/audit.js';
import type { AuthenticatedRequest } from '../types/auth.js';

const router = Router();
router.use(authenticate);

const attendanceInput = z.object({ studentId: z.string(), classId: z.string(), subjectId: z.string().optional(), date: z.coerce.date(), status: z.enum(['present', 'absent', 'late', 'excused']), remarks: z.string().optional() });
const assignmentInput = z.object({ title: z.string().min(1), description: z.string().min(1), subjectId: z.string(), classId: z.string(), dueAt: z.coerce.date(), attachments: z.array(z.object({ name: z.string(), url: z.string().url() })).optional(), status: z.enum(['draft', 'published', 'closed']).optional() });
const submissionInput = z.object({ assignmentId: z.string(), studentId: z.string(), answerText: z.string().optional(), files: z.array(z.object({ name: z.string(), url: z.string().url() })).optional(), status: z.enum(['draft', 'submitted']).default('submitted') });
const assessmentInput = z.object({ title: z.string().min(1), type: z.enum(['test', 'exam', 'project', 'assignment']), subjectId: z.string(), classId: z.string(), schoolYearId: z.string(), term: z.string().min(1), maxScore: z.number().positive(), published: z.boolean().optional() });
const gradeInput = z.object({ assessmentId: z.string(), studentId: z.string(), score: z.number().min(0), grade: z.string().optional(), remarks: z.string().optional() });
const reportInput = z.object({ schoolYearId: z.string(), term: z.string().min(1), teacherComment: z.string().optional(), principalComment: z.string().optional() });

router.get('/attendance', requirePermission('records:read'), async (request, response, next) => {
  try {
    const filter: Record<string, unknown> = {};
    if (request.query.studentId) filter.studentId = request.query.studentId;
    if (request.query.classId) filter.classId = request.query.classId;
    if (request.query.date) filter.date = { $gte: new Date(String(request.query.date)), $lt: new Date(new Date(String(request.query.date)).getTime() + 86400000) };
    response.json({ attendance: await AttendanceRecord.find(filter).populate('studentId').sort({ date: -1 }).lean() });
  } catch (error) { next(error); }
});

router.post('/attendance', requirePermission('records:manage'), async (request: AuthenticatedRequest, response, next) => {
  try {
    const input = attendanceInput.parse(request.body);
    const filter = { studentId: input.studentId, subjectId: input.subjectId ?? null, date: input.date };
    const before = await AttendanceRecord.findOne(filter).lean();
    const attendance = await AttendanceRecord.findOneAndUpdate(filter, { ...input, recordedBy: request.user!.id }, { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true });
    await writeAuditLog({ request, actorId: request.user!.id, action: before ? 'attendance.updated' : 'attendance.created', entityType: 'AttendanceRecord', entityId: attendance!.id, before, after: attendance!.toObject() });
    response.status(before ? 200 : 201).json({ attendance });
  } catch (error) { next(error); }
});

router.get('/assignments', requirePermission('records:read'), async (request, response, next) => {
  try { response.json({ assignments: await Assignment.find(request.query.classId ? { classId: request.query.classId } : {}).populate('subjectId', 'name code').sort({ dueAt: 1 }).lean() }); } catch (error) { next(error); }
});

router.post('/assignments', requirePermission('records:manage'), async (request: AuthenticatedRequest, response, next) => {
  try {
    const input = assignmentInput.parse(request.body);
    const assignment = await Assignment.create({ ...input, teacherId: request.user!.id });
    await writeAuditLog({ request, actorId: request.user!.id, action: 'assignment.created', entityType: 'Assignment', entityId: assignment.id, after: input });
    response.status(201).json({ assignment });
  } catch (error) { next(error); }
});

router.post('/assignment-submissions', requirePermission('records:submit'), async (request: AuthenticatedRequest, response, next) => {
  try {
    const input = submissionInput.parse(request.body);
    const currentStudent = await Student.findOne({ userId: request.user!.id }).select('_id');
    const studentId = currentStudent ? String(currentStudent._id) : input.studentId;
    const assignment = await Assignment.findById(input.assignmentId).select('dueAt');
    if (!assignment) { response.status(404).json({ error: 'Assignment not found' }); return; }
    const status = input.status === 'submitted' && new Date() > assignment.dueAt ? 'late' : input.status;
    const before = await AssignmentSubmission.findOne({ assignmentId: input.assignmentId, studentId }).lean();
    const submission = await AssignmentSubmission.findOneAndUpdate({ assignmentId: input.assignmentId, studentId }, { ...input, studentId, submittedAt: input.status === 'submitted' ? new Date() : undefined, status }, { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true });
    await writeAuditLog({ request, actorId: request.user!.id, action: before ? 'assignment.submission_updated' : 'assignment.submitted', entityType: 'AssignmentSubmission', entityId: submission!.id, before, after: submission!.toObject() });
    response.status(before ? 200 : 201).json({ submission });
  } catch (error) { next(error); }
});

router.get('/assessments', requirePermission('records:read'), async (request, response, next) => {
  try { response.json({ assessments: await Assessment.find(request.query.classId ? { classId: request.query.classId } : {}).populate('subjectId', 'name code').sort({ createdAt: -1 }).lean() }); } catch (error) { next(error); }
});

router.post('/assessments', requirePermission('records:manage'), async (request: AuthenticatedRequest, response, next) => {
  try {
    const input = assessmentInput.parse(request.body);
    const assessment = await Assessment.create(input);
    await writeAuditLog({ request, actorId: request.user!.id, action: 'assessment.created', entityType: 'Assessment', entityId: assessment.id, after: input });
    response.status(201).json({ assessment });
  } catch (error) { next(error); }
});

router.get('/grades', requirePermission('records:read'), async (request, response, next) => {
  try { response.json({ grades: await Grade.find(request.query.studentId ? { studentId: request.query.studentId } : {}).populate('assessmentId').sort({ createdAt: -1 }).lean() }); } catch (error) { next(error); }
});

router.post('/grades', requirePermission('records:manage'), async (request: AuthenticatedRequest, response, next) => {
  try {
    const input = gradeInput.parse(request.body);
    const assessment = await Assessment.findById(input.assessmentId).select('maxScore');
    if (!assessment) { response.status(404).json({ error: 'Assessment not found' }); return; }
    if (input.score > assessment.maxScore) { response.status(400).json({ error: 'Score cannot exceed the assessment maximum' }); return; }
    const before = await Grade.findOne({ assessmentId: input.assessmentId, studentId: input.studentId }).lean();
    const grade = await Grade.findOneAndUpdate({ assessmentId: input.assessmentId, studentId: input.studentId }, { ...input, gradedBy: request.user!.id, gradedAt: new Date() }, { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true });
    await writeAuditLog({ request, actorId: request.user!.id, action: before ? 'grade.updated' : 'grade.created', entityType: 'Grade', entityId: grade!.id, before, after: grade!.toObject() });
    response.status(before ? 200 : 201).json({ grade });
  } catch (error) { next(error); }
});

router.get('/report-cards', requirePermission('records:read'), async (request, response, next) => {
  try { response.json({ reportCards: await ReportCard.find(request.query.studentId ? { studentId: request.query.studentId } : {}).populate('studentId').sort({ createdAt: -1 }).lean() }); } catch (error) { next(error); }
});

router.post('/report-cards/:studentId/publish', requirePermission('records:manage'), async (request: AuthenticatedRequest, response, next) => {
  try {
    const input = reportInput.parse(request.body);
    const student = await Student.findById(request.params.studentId).select('classId');
    if (!student) { response.status(404).json({ error: 'Student not found' }); return; }
    const assessments = await Assessment.find({ classId: student.classId, schoolYearId: input.schoolYearId, term: input.term }).select('_id subjectId maxScore');
    const grades = await Grade.find({ assessmentId: { $in: assessments.map((assessment) => assessment._id) }, studentId: student._id }).lean();
    const subjects = await Subject.find({ _id: { $in: assessments.map((assessment) => assessment.subjectId) } }).select('name').lean();
    const subjectSnapshots = subjects.map((subject) => {
      const subjectAssessments = assessments.filter((assessment) => String(assessment.subjectId) === String(subject._id));
      const subjectGrades = grades.filter((grade) => subjectAssessments.some((assessment) => String(assessment._id) === String(grade.assessmentId)));
      const totalMax = subjectAssessments.reduce((total, assessment) => total + assessment.maxScore, 0);
      const totalScore = subjectGrades.reduce((total, grade) => total + grade.score, 0);
      const average = totalMax ? Math.round((totalScore / totalMax) * 10000) / 100 : 0;
      return { subjectId: subject._id, subjectName: subject.name, average, grade: average >= 70 ? 'A' : average >= 60 ? 'B' : average >= 50 ? 'C' : average >= 40 ? 'D' : 'F' };
    });
    const average = subjectSnapshots.length ? Math.round(subjectSnapshots.reduce((total, subject) => total + subject.average, 0) / subjectSnapshots.length * 100) / 100 : 0;
    const reportCard = await ReportCard.findOneAndUpdate({ studentId: student._id, schoolYearId: input.schoolYearId, term: input.term }, { ...input, studentId: student._id, subjects: subjectSnapshots, average, publishedAt: new Date(), publishedBy: request.user!.id }, { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true });
    await writeAuditLog({ request, actorId: request.user!.id, action: 'report_card.published', entityType: 'ReportCard', entityId: reportCard!.id, after: reportCard!.toObject() });
    response.status(201).json({ reportCard });
  } catch (error) { next(error); }
});

export default router;
