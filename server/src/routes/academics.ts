import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requirePermission } from '../middleware/auth.js';
import { SchoolYear } from '../models/SchoolYear.js';
import { Subject } from '../models/Subject.js';
import { SchoolClass } from '../models/Class.js';
import { Student } from '../models/Student.js';
import { Staff } from '../models/Staff.js';
import { StudentGuardian } from '../models/StudentGuardian.js';
import { User } from '../models/User.js';
import { writeAuditLog } from '../services/audit.js';
import type { AuthenticatedRequest } from '../types/auth.js';

const router = Router();
router.use(authenticate);

const schoolYearInput = z.object({ name: z.string().min(1), startsAt: z.coerce.date(), endsAt: z.coerce.date(), status: z.enum(['planned', 'active', 'closed']).optional() });
const subjectInput = z.object({ name: z.string().min(1), code: z.string().min(1), description: z.string().optional() });
const classInput = z.object({ name: z.string().min(1), level: z.string().min(1), schoolYearId: z.string(), classTeacherId: z.string().optional() });
const studentInput = z.object({ userId: z.string(), admissionNumber: z.string().min(1), dateOfBirth: z.coerce.date().optional(), gender: z.enum(['female', 'male', 'other', 'undisclosed']).optional(), address: z.string().optional(), classId: z.string().optional(), admissionDate: z.coerce.date() });
const staffInput = z.object({ userId: z.string(), employeeNumber: z.string().min(1), department: z.string().optional(), jobTitle: z.string().min(1), hireDate: z.coerce.date().optional() });
const guardianInput = z.object({ studentId: z.string(), guardianId: z.string(), relationship: z.string().min(1), isPrimaryContact: z.boolean().optional() });

router.get('/school-years', requirePermission('academics:read'), async (_request, response, next) => {
  try { response.json({ schoolYears: await SchoolYear.find().sort({ startsAt: -1 }).lean() }); } catch (error) { next(error); }
});

router.post('/school-years', requirePermission('academics:manage'), async (request: AuthenticatedRequest, response, next) => {
  try {
    const input = schoolYearInput.parse(request.body);
    if (input.endsAt <= input.startsAt) { response.status(400).json({ error: 'The school year must end after it starts' }); return; }
    const schoolYear = await SchoolYear.create(input);
    await writeAuditLog({ request, actorId: request.user!.id, action: 'school_year.created', entityType: 'SchoolYear', entityId: schoolYear.id, after: input });
    response.status(201).json({ schoolYear });
  } catch (error) { next(error); }
});

router.get('/subjects', requirePermission('academics:read'), async (_request, response, next) => {
  try { response.json({ subjects: await Subject.find().sort({ name: 1 }).lean() }); } catch (error) { next(error); }
});

router.post('/subjects', requirePermission('academics:manage'), async (request: AuthenticatedRequest, response, next) => {
  try {
    const input = subjectInput.parse(request.body);
    const subject = await Subject.create(input);
    await writeAuditLog({ request, actorId: request.user!.id, action: 'subject.created', entityType: 'Subject', entityId: subject.id, after: input });
    response.status(201).json({ subject });
  } catch (error) { next(error); }
});

router.get('/classes', requirePermission('academics:read'), async (request, response, next) => {
  try { response.json({ classes: await SchoolClass.find(request.query.schoolYearId ? { schoolYearId: request.query.schoolYearId } : {}).populate('classTeacherId').sort({ level: 1, name: 1 }).lean() }); } catch (error) { next(error); }
});

router.post('/classes', requirePermission('academics:manage'), async (request: AuthenticatedRequest, response, next) => {
  try {
    const input = classInput.parse(request.body);
    const schoolClass = await SchoolClass.create(input);
    await writeAuditLog({ request, actorId: request.user!.id, action: 'class.created', entityType: 'Class', entityId: schoolClass.id, after: input });
    response.status(201).json({ class: schoolClass });
  } catch (error) { next(error); }
});

router.get('/students', requirePermission('academics:read'), async (request, response, next) => {
  try { response.json({ students: await Student.find(request.query.classId ? { classId: request.query.classId } : {}).populate('userId', 'firstName lastName email').populate('classId', 'name level').sort({ admissionNumber: 1 }).lean() }); } catch (error) { next(error); }
});

router.post('/students', requirePermission('academics:manage'), async (request: AuthenticatedRequest, response, next) => {
  try {
    const input = studentInput.parse(request.body);
    const user = await User.findById(input.userId).select('_id');
    if (!user) { response.status(404).json({ error: 'Student user account not found' }); return; }
    const student = await Student.create(input);
    await writeAuditLog({ request, actorId: request.user!.id, action: 'student.created', entityType: 'Student', entityId: student.id, after: input });
    response.status(201).json({ student });
  } catch (error) { next(error); }
});

router.get('/staff', requirePermission('academics:read'), async (_request, response, next) => {
  try { response.json({ staff: await Staff.find().populate('userId', 'firstName lastName email').sort({ employeeNumber: 1 }).lean() }); } catch (error) { next(error); }
});

router.post('/staff', requirePermission('academics:manage'), async (request: AuthenticatedRequest, response, next) => {
  try {
    const input = staffInput.parse(request.body);
    const user = await User.findById(input.userId).select('_id');
    if (!user) { response.status(404).json({ error: 'Staff user account not found' }); return; }
    const staff = await Staff.create(input);
    await writeAuditLog({ request, actorId: request.user!.id, action: 'staff.created', entityType: 'Staff', entityId: staff.id, after: input });
    response.status(201).json({ staff });
  } catch (error) { next(error); }
});

router.post('/guardians', requirePermission('academics:manage'), async (request: AuthenticatedRequest, response, next) => {
  try {
    const input = guardianInput.parse(request.body);
    const [student, guardian] = await Promise.all([Student.findById(input.studentId).select('_id'), User.findById(input.guardianId).select('_id')]);
    if (!student || !guardian) { response.status(404).json({ error: 'Student or guardian account not found' }); return; }
    const relationship = await StudentGuardian.create(input);
    await writeAuditLog({ request, actorId: request.user!.id, action: 'student.guardian_added', entityType: 'StudentGuardian', entityId: relationship.id, after: input });
    response.status(201).json({ relationship });
  } catch (error) { next(error); }
});

export default router;
