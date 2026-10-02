import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requirePermission } from '../middleware/auth.js';
import { SchoolYear } from '../models/SchoolYear.js';
import { Term } from '../models/Term.js';
import { Subject } from '../models/Subject.js';
import { SchoolClass } from '../models/Class.js';
import { Student } from '../models/Student.js';
import { StudentEnrollment } from '../models/StudentEnrollment.js';
import { Staff } from '../models/Staff.js';
import { StudentGuardian } from '../models/StudentGuardian.js';
import { User } from '../models/User.js';
import { Role } from '../models/Role.js';
import { Assessment } from '../models/Assessment.js';
import { Assignment } from '../models/Assignment.js';
import { AttendanceRecord } from '../models/AttendanceRecord.js';
import { CbtExam } from '../models/CbtExam.js';
import { FeeStructure } from '../models/FeeStructure.js';
import { ReportCard } from '../models/ReportCard.js';
import { writeAuditLog } from '../services/audit.js';
import type { AuthenticatedRequest } from '../types/auth.js';
import bcrypt from 'bcryptjs';
import { createStudentLoginCode } from '../services/student-login-codes.js';

const router = Router();
router.use(authenticate);

const schoolYearInput = z.object({ name: z.string().min(1), startsAt: z.coerce.date(), endsAt: z.coerce.date(), status: z.enum(['planned', 'active', 'closed']).optional() });
const schoolYearUpdateInput = schoolYearInput.partial();
const termInput = z.object({ name: z.string().min(1), schoolYearId: z.string(), order: z.number().int().min(1).max(3), startsAt: z.coerce.date().optional(), endsAt: z.coerce.date().optional() });
const termUpdateInput = z.object({ name: z.string().trim().min(1).optional(), order: z.number().int().min(1).max(3).optional(), startsAt: z.coerce.date().nullable().optional(), endsAt: z.coerce.date().nullable().optional() });
const subjectInput = z.object({ name: z.string().min(1), code: z.string().min(1), description: z.string().optional() });
const objectIdInput = z.string().regex(/^[\da-f]{24}$/i, 'Invalid ID');
const classInput = z.object({ name: z.string().trim().min(1), level: z.string().trim().min(1), schoolYearId: objectIdInput, classTeacherId: objectIdInput.optional() });
const classUpdateInput = z.object({ name: z.string().trim().min(1).optional(), level: z.string().trim().min(1).optional(), classTeacherId: objectIdInput.nullable().optional() });
const classTeacherInput = z.object({ classTeacherId: z.string().nullable() });
const studentInput = z.object({ userId: z.string(), admissionNumber: z.string().min(1), dateOfBirth: z.coerce.date().optional(), gender: z.enum(['female', 'male', 'other', 'undisclosed']).optional(), address: z.string().optional(), classId: z.string().optional(), admissionDate: z.coerce.date() });
const studentPasswordInput = z.object({ password: z.string().min(8) });
const enrollmentInput = z.object({ firstName: z.string().trim().min(1), middleName: z.string().trim().optional(), lastName: z.string().trim().min(1), password: z.string().min(8), dateOfBirth: z.coerce.date().optional(), gender: z.enum(['female', 'male', 'other', 'undisclosed']).optional(), address: z.string().trim().optional(), admissionDate: z.coerce.date(), schoolYearId: z.string(), termId: z.string(), classId: z.string() });
const returningEnrollmentInput = z.object({ loginCode: z.string().trim().min(1), schoolYearId: z.string(), termId: z.string(), classId: z.string() });
const staffInput = z.object({ userId: z.string(), employeeNumber: z.string().min(1), department: z.string().optional(), jobTitle: z.string().min(1), hireDate: z.coerce.date().optional() });
const guardianInput = z.object({ studentId: z.string(), guardianId: z.string(), relationship: z.string().min(1), isPrimaryContact: z.boolean().optional() });

async function findActiveTeacherStaff(staffId: string) {
  const teacherRole = await Role.findOne({ name: 'teacher' }).select('_id');
  if (!teacherRole) return null;
  const staff = await Staff.findOne({ _id: staffId, employmentStatus: 'active' }).select('_id userId');
  if (!staff || !await User.exists({ _id: staff.userId, roleIds: teacherRole._id })) return null;
  return staff;
}

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

router.patch('/school-years/:id', requirePermission('academics:manage'), async (request: AuthenticatedRequest, response, next) => {
  try {
    const input = schoolYearUpdateInput.parse(request.body);
    if (!Object.keys(input).length) { response.status(400).json({ error: 'Provide at least one school year field to update' }); return; }
    const schoolYear = await SchoolYear.findById(request.params.id);
    if (!schoolYear) { response.status(404).json({ error: 'School year not found' }); return; }
    const before = { name: schoolYear.name, startsAt: schoolYear.startsAt, endsAt: schoolYear.endsAt, status: schoolYear.status };
    const updated = { ...before, ...input };
    if (updated.endsAt <= updated.startsAt) { response.status(400).json({ error: 'The school year must end after it starts' }); return; }
    const linkedTerms = await Term.find({ schoolYearId: schoolYear._id }).select('startsAt endsAt').lean();
    if (linkedTerms.some((term) => (term.startsAt && (term.startsAt < updated.startsAt || term.startsAt > updated.endsAt)) || (term.endsAt && (term.endsAt < updated.startsAt || term.endsAt > updated.endsAt)))) { response.status(400).json({ error: 'School year dates cannot exclude existing term dates' }); return; }
    if (input.name && await SchoolYear.exists({ _id: { $ne: schoolYear._id }, name: input.name })) { response.status(409).json({ error: 'A school year with this name already exists' }); return; }
    Object.assign(schoolYear, input);
    await schoolYear.save();
    await writeAuditLog({ request, actorId: request.user!.id, action: 'school_year.updated', entityType: 'SchoolYear', entityId: schoolYear.id, before, after: updated });
    response.json({ schoolYear });
  } catch (error) { next(error); }
});

router.delete('/school-years/:id', requirePermission('academics:manage'), async (request: AuthenticatedRequest, response, next) => {
  try {
    const schoolYear = await SchoolYear.findById(request.params.id);
    if (!schoolYear) { response.status(404).json({ error: 'School year not found' }); return; }
    const [hasClasses, hasTerms, hasAssessments, hasFees, hasReportCards, hasEnrollments] = await Promise.all([
      SchoolClass.exists({ schoolYearId: schoolYear._id }), Term.exists({ schoolYearId: schoolYear._id }), Assessment.exists({ schoolYearId: schoolYear._id }),
      FeeStructure.exists({ schoolYearId: schoolYear._id }), ReportCard.exists({ schoolYearId: schoolYear._id }), StudentEnrollment.exists({ schoolYearId: schoolYear._id })
    ]);
    if (hasClasses || hasTerms || hasAssessments || hasFees || hasReportCards || hasEnrollments) { response.status(409).json({ error: 'This school year has linked academic or financial records and cannot be deleted' }); return; }
    await schoolYear.deleteOne();
    await writeAuditLog({ request, actorId: request.user!.id, action: 'school_year.deleted', entityType: 'SchoolYear', entityId: schoolYear.id, before: { name: schoolYear.name } });
    response.json({ success: true });
  } catch (error) { next(error); }
});

router.get('/terms', requirePermission('academics:read'), async (request, response, next) => {
  try {
    const filter = request.query.schoolYearId ? { schoolYearId: request.query.schoolYearId } : {};
    response.json({ terms: await Term.find(filter).sort({ schoolYearId: -1, order: 1 }).lean() });
  } catch (error) { next(error); }
});

router.post('/terms', requirePermission('academics:manage'), async (request: AuthenticatedRequest, response, next) => {
  try {
    const input = termInput.parse(request.body);
    if (input.startsAt && input.endsAt && input.endsAt <= input.startsAt) { response.status(400).json({ error: 'The term must end after it starts' }); return; }
    const schoolYear = await SchoolYear.findById(input.schoolYearId).select('startsAt endsAt');
    if (!schoolYear) { response.status(404).json({ error: 'School year not found' }); return; }
    if ((input.startsAt && (input.startsAt < schoolYear.startsAt || input.startsAt > schoolYear.endsAt)) || (input.endsAt && (input.endsAt < schoolYear.startsAt || input.endsAt > schoolYear.endsAt))) { response.status(400).json({ error: 'Term dates must fall within the school year' }); return; }
    const term = await Term.create(input);
    await writeAuditLog({ request, actorId: request.user!.id, action: 'term.created', entityType: 'Term', entityId: term.id, after: input });
    response.status(201).json({ term });
  } catch (error) { next(error); }
});

router.patch('/terms/:id', requirePermission('academics:manage'), async (request: AuthenticatedRequest, response, next) => {
  try {
    const input = termUpdateInput.parse(request.body);
    if (!Object.keys(input).length) { response.status(400).json({ error: 'Provide at least one term field to update' }); return; }
    const term = await Term.findById(request.params.id);
    if (!term) { response.status(404).json({ error: 'Term not found' }); return; }
    const schoolYear = await SchoolYear.findById(term.schoolYearId).select('startsAt endsAt');
    if (!schoolYear) { response.status(404).json({ error: 'School year not found' }); return; }
    const startsAt = input.startsAt === null ? undefined : input.startsAt ?? term.startsAt;
    const endsAt = input.endsAt === null ? undefined : input.endsAt ?? term.endsAt;
    if (startsAt && endsAt && endsAt <= startsAt) { response.status(400).json({ error: 'The term must end after it starts' }); return; }
    if ((startsAt && (startsAt < schoolYear.startsAt || startsAt > schoolYear.endsAt)) || (endsAt && (endsAt < schoolYear.startsAt || endsAt > schoolYear.endsAt))) { response.status(400).json({ error: 'Term dates must fall within the school year' }); return; }
    if (input.name && await Term.exists({ _id: { $ne: term._id }, schoolYearId: term.schoolYearId, name: input.name })) { response.status(409).json({ error: 'A term with this name already exists for this school year' }); return; }
    if (input.order && await Term.exists({ _id: { $ne: term._id }, schoolYearId: term.schoolYearId, order: input.order })) { response.status(409).json({ error: 'Another term already uses this order in the school year' }); return; }
    const before = { name: term.name, order: term.order, startsAt: term.startsAt, endsAt: term.endsAt };
    if (input.name !== undefined) term.name = input.name;
    if (input.order !== undefined) term.order = input.order;
    if (input.startsAt !== undefined) term.startsAt = input.startsAt ?? undefined;
    if (input.endsAt !== undefined) term.endsAt = input.endsAt ?? undefined;
    await term.save();
    await writeAuditLog({ request, actorId: request.user!.id, action: 'term.updated', entityType: 'Term', entityId: term.id, before, after: { name: term.name, order: term.order, startsAt: term.startsAt, endsAt: term.endsAt } });
    response.json({ term });
  } catch (error) { next(error); }
});

router.delete('/terms/:id', requirePermission('academics:manage'), async (request: AuthenticatedRequest, response, next) => {
  try {
    const term = await Term.findById(request.params.id);
    if (!term) { response.status(404).json({ error: 'Term not found' }); return; }
    if (await StudentEnrollment.exists({ termId: term._id })) { response.status(409).json({ error: 'This term has student enrollments and cannot be deleted' }); return; }
    await term.deleteOne();
    await writeAuditLog({ request, actorId: request.user!.id, action: 'term.deleted', entityType: 'Term', entityId: term.id, before: { name: term.name, schoolYearId: term.schoolYearId } });
    response.json({ success: true });
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
  try { response.json({ classes: await SchoolClass.find(request.query.schoolYearId ? { schoolYearId: request.query.schoolYearId } : {}).populate('classTeacherId').populate({ path: 'classTeacherId', populate: { path: 'userId', select: 'firstName lastName' } }).sort({ level: 1, name: 1 }).lean() }); } catch (error) { next(error); }
});

router.get('/teachers', requirePermission('academics:read'), async (_request, response, next) => {
  try {
    const teacherRole = await Role.findOne({ name: 'teacher' }).select('_id');
    const teacherUsers = teacherRole ? await User.find({ roleIds: teacherRole._id }).distinct('_id') : [];
    const teachers = await Staff.find({ userId: { $in: teacherUsers }, employmentStatus: 'active' }).populate('userId', 'firstName lastName').sort({ employeeNumber: 1 }).lean();
    response.json({ teachers });
  } catch (error) { next(error); }
});

router.post('/classes', requirePermission('academics:manage'), async (request: AuthenticatedRequest, response, next) => {
  try {
    const input = classInput.parse(request.body);
    const schoolYear = await SchoolYear.exists({ _id: input.schoolYearId });
    if (!schoolYear) { response.status(404).json({ error: 'School year not found' }); return; }
    const duplicate = await SchoolClass.exists({ name: input.name, schoolYearId: input.schoolYearId });
    if (duplicate) { response.status(409).json({ error: 'A class with this name already exists for this school year' }); return; }
    if (input.classTeacherId && !await findActiveTeacherStaff(input.classTeacherId)) { response.status(400).json({ error: 'Select an active teacher account' }); return; }
    const schoolClass = await SchoolClass.create(input);
    await writeAuditLog({ request, actorId: request.user!.id, action: 'class.created', entityType: 'Class', entityId: schoolClass.id, after: input });
    response.status(201).json({ class: schoolClass });
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 11000) {
      response.status(409).json({ error: 'A class with this name already exists for this school year' });
      return;
    }
    next(error);
  }
});

router.patch('/classes/:id/teacher', requirePermission('academics:manage'), async (request: AuthenticatedRequest, response, next) => {
  try {
    const input = classTeacherInput.parse(request.body);
    const schoolClass = await SchoolClass.findById(request.params.id);
    if (!schoolClass) { response.status(404).json({ error: 'Class not found' }); return; }
    const teacher = input.classTeacherId ? await findActiveTeacherStaff(input.classTeacherId) : null;
    if (input.classTeacherId && !teacher) { response.status(400).json({ error: 'Select an active teacher account' }); return; }
    const previousTeacherId = schoolClass.classTeacherId ? String(schoolClass.classTeacherId) : null;
    schoolClass.classTeacherId = teacher?._id;
    await schoolClass.save();
    await writeAuditLog({ request, actorId: request.user!.id, action: 'class.teacher_assigned', entityType: 'Class', entityId: schoolClass.id, before: { classTeacherId: previousTeacherId }, after: { classTeacherId: input.classTeacherId } });
    response.json({ class: schoolClass });
  } catch (error) { next(error); }
});

router.patch('/classes/:id', requirePermission('academics:manage'), async (request: AuthenticatedRequest, response, next) => {
  try {
    const input = classUpdateInput.parse(request.body);
    if (!Object.keys(input).length) { response.status(400).json({ error: 'Provide at least one class field to update' }); return; }
    const schoolClass = await SchoolClass.findById(request.params.id);
    if (!schoolClass) { response.status(404).json({ error: 'Class not found' }); return; }
    if (input.name && await SchoolClass.exists({ _id: { $ne: schoolClass._id }, schoolYearId: schoolClass.schoolYearId, name: input.name })) { response.status(409).json({ error: 'A class with this name already exists for this school year' }); return; }
    let teacher;
    if (input.classTeacherId) {
      teacher = await findActiveTeacherStaff(input.classTeacherId);
      if (!teacher) { response.status(400).json({ error: 'Select an active teacher account' }); return; }
    }
    const before = { name: schoolClass.name, level: schoolClass.level, classTeacherId: schoolClass.classTeacherId ? String(schoolClass.classTeacherId) : null };
    if (input.name !== undefined) schoolClass.name = input.name;
    if (input.level !== undefined) schoolClass.level = input.level;
    if (input.classTeacherId !== undefined) schoolClass.classTeacherId = teacher?._id;
    await schoolClass.save();
    const after = { name: schoolClass.name, level: schoolClass.level, classTeacherId: schoolClass.classTeacherId ? String(schoolClass.classTeacherId) : null };
    await writeAuditLog({ request, actorId: request.user!.id, action: 'class.updated', entityType: 'Class', entityId: schoolClass.id, before, after });
    response.json({ class: schoolClass });
  } catch (error) { next(error); }
});

router.delete('/classes/:id', requirePermission('academics:manage'), async (request: AuthenticatedRequest, response, next) => {
  try {
    const schoolClass = await SchoolClass.findById(request.params.id);
    if (!schoolClass) { response.status(404).json({ error: 'Class not found' }); return; }
    const [hasEnrollments, hasStudents, hasAssessments, hasAssignments, hasAttendance, hasExams, hasFees] = await Promise.all([
      StudentEnrollment.exists({ classId: schoolClass._id }), Student.exists({ classId: schoolClass._id }), Assessment.exists({ classId: schoolClass._id }),
      Assignment.exists({ classId: schoolClass._id }), AttendanceRecord.exists({ classId: schoolClass._id }), CbtExam.exists({ classId: schoolClass._id }), FeeStructure.exists({ classId: schoolClass._id })
    ]);
    if (hasEnrollments || hasStudents || hasAssessments || hasAssignments || hasAttendance || hasExams || hasFees) { response.status(409).json({ error: 'This class has linked student, academic, or financial records and cannot be deleted' }); return; }
    await schoolClass.deleteOne();
    await writeAuditLog({ request, actorId: request.user!.id, action: 'class.deleted', entityType: 'Class', entityId: schoolClass.id, before: { name: schoolClass.name, schoolYearId: schoolClass.schoolYearId } });
    response.json({ success: true });
  } catch (error) { next(error); }
});

router.get('/students', requirePermission('academics:read'), async (request, response, next) => {
  try { response.json({ students: await Student.find(request.query.classId ? { classId: request.query.classId } : {}).populate('userId', 'firstName lastName email').populate('classId', 'name level').sort({ admissionNumber: 1 }).lean() }); } catch (error) { next(error); }
});

router.patch('/students/:id/password', requirePermission('academics:manage'), async (request: AuthenticatedRequest, response, next) => {
  try {
    const input = studentPasswordInput.parse(request.body);
    const student = await Student.findById(request.params.id).select('userId');
    if (!student) { response.status(404).json({ error: 'Student not found' }); return; }
    const user = await User.findById(student.userId).select('+passwordHash');
    if (!user) { response.status(404).json({ error: 'Student account not found' }); return; }
    user.passwordHash = await bcrypt.hash(input.password, 12);
    await user.save();
    await writeAuditLog({ request, actorId: request.user!.id, action: 'student.password_reset', entityType: 'Student', entityId: student.id, after: { userId: user.id } });
    response.json({ success: true });
  } catch (error) { next(error); }
});

router.get('/enrollment-classes', requirePermission('academics:enroll'), async (request: AuthenticatedRequest, response, next) => {
  try {
    const roles = await Role.find({ _id: { $in: request.user!.roleIds } }).select('permissions').lean();
    const canManageAll = roles.some((role) => role.permissions.includes('academics:manage'));
    if (canManageAll) {
      response.json({ classes: await SchoolClass.find().populate('schoolYearId', 'name status').sort({ schoolYearId: -1, level: 1, name: 1 }).lean() });
      return;
    }
    const staff = await Staff.findOne({ userId: request.user!.id, employmentStatus: 'active' }).select('_id');
    const classes = staff ? await SchoolClass.find({ classTeacherId: staff._id }).populate('schoolYearId', 'name status').sort({ schoolYearId: -1, level: 1, name: 1 }).lean() : [];
    response.json({ classes });
  } catch (error) { next(error); }
});

router.get('/enrollments', requirePermission('academics:enroll'), async (request: AuthenticatedRequest, response, next) => {
  try {
    const classId = String(request.query.classId ?? '');
    const schoolYearId = String(request.query.schoolYearId ?? '');
    const schoolClass = await SchoolClass.findOne({ _id: classId, schoolYearId }).select('_id classTeacherId');
    if (!schoolClass) { response.status(404).json({ error: 'Class not found for that school year' }); return; }
    const roles = await Role.find({ _id: { $in: request.user!.roleIds } }).select('permissions').lean();
    const canManageAll = roles.some((role) => role.permissions.includes('academics:manage'));
    if (!canManageAll) {
      const staff = await Staff.findOne({ userId: request.user!.id, employmentStatus: 'active' }).select('_id');
      if (!staff || String(schoolClass.classTeacherId) !== String(staff._id)) { response.status(403).json({ error: 'You can only access your assigned class register' }); return; }
    }
    const enrollments = await StudentEnrollment.find({ classId, schoolYearId }).populate({ path: 'studentId', populate: { path: 'userId', select: 'firstName middleName lastName loginCode' } }).sort({ createdAt: 1 }).lean();
    response.json({ enrollments });
  } catch (error) { next(error); }
});

router.post('/enrollments', requirePermission('academics:enroll'), async (request: AuthenticatedRequest, response, next) => {
  let createdUserId: string | undefined;
  let createdStudentId: string | undefined;
  let createdEnrollmentId: string | undefined;
  try {
    const input = enrollmentInput.parse(request.body);
    const [schoolClass, term, schoolYear, studentRole] = await Promise.all([
      SchoolClass.findById(input.classId).select('_id schoolYearId classTeacherId'),
      Term.findById(input.termId).select('_id schoolYearId'),
      SchoolYear.findById(input.schoolYearId).select('_id'),
      Role.findOne({ name: 'student' }).select('_id')
    ]);
    if (!schoolClass || !schoolYear || String(schoolClass.schoolYearId) !== input.schoolYearId) { response.status(400).json({ error: 'Select a class in the chosen school year' }); return; }
    if (!term || String(term.schoolYearId) !== input.schoolYearId) { response.status(400).json({ error: 'Select a term in the chosen school year' }); return; }
    if (!studentRole) { response.status(500).json({ error: 'Student role is not configured' }); return; }
    const roles = await Role.find({ _id: { $in: request.user!.roleIds } }).select('permissions').lean();
    const canManageAll = roles.some((role) => role.permissions.includes('academics:manage'));
    if (!canManageAll) {
      const staff = await Staff.findOne({ userId: request.user!.id, employmentStatus: 'active' }).select('_id');
      if (!staff || String(schoolClass.classTeacherId) !== String(staff._id)) { response.status(403).json({ error: 'You can only enroll students in your assigned class' }); return; }
    }

    const loginCode = await createStudentLoginCode(async (code) => Boolean(await User.exists({ loginCode: code })));
    if (!loginCode) { response.status(503).json({ error: 'Unable to generate a student login code. Please try again.' }); return; }

    const user = await User.create({
      email: `${loginCode.toLowerCase()}@student.sapienza.invalid`,
      loginCode,
      passwordHash: await bcrypt.hash(input.password, 12),
      firstName: input.firstName,
      ...(input.middleName ? { middleName: input.middleName } : {}),
      lastName: input.lastName,
      roleIds: [studentRole._id]
    });
    createdUserId = user.id;
    const student = await Student.create({
      userId: user._id,
      admissionNumber: loginCode,
      dateOfBirth: input.dateOfBirth,
      gender: input.gender,
      address: input.address,
      classId: input.classId,
      admissionDate: input.admissionDate
    });
    createdStudentId = student.id;
    const enrollment = await StudentEnrollment.create({
      studentId: student._id,
      schoolYearId: input.schoolYearId,
      termId: input.termId,
      classId: input.classId,
      registeredBy: request.user!.id
    });
    createdEnrollmentId = enrollment.id;
    await writeAuditLog({ request, actorId: request.user!.id, action: 'student.enrolled', entityType: 'StudentEnrollment', entityId: enrollment.id, after: { studentId: student.id, schoolYearId: input.schoolYearId, termId: input.termId, classId: input.classId, loginCode } });
    response.status(201).json({ enrollment, student: { id: student.id, firstName: user.firstName, lastName: user.lastName, loginCode } });
  } catch (error) {
    if (createdEnrollmentId) await StudentEnrollment.findByIdAndDelete(createdEnrollmentId);
    if (createdStudentId) await Student.findByIdAndDelete(createdStudentId);
    if (createdUserId) await User.findByIdAndDelete(createdUserId);
    next(error);
  }
});

router.post('/enrollments/returning', requirePermission('academics:enroll'), async (request: AuthenticatedRequest, response, next) => {
  let enrollmentId: string | undefined;
  try {
    const input = returningEnrollmentInput.parse(request.body);
    const [schoolClass, term, schoolYear] = await Promise.all([
      SchoolClass.findById(input.classId).select('_id schoolYearId classTeacherId'),
      Term.findById(input.termId).select('_id schoolYearId'),
      SchoolYear.findById(input.schoolYearId).select('_id')
    ]);
    if (!schoolClass || !schoolYear || String(schoolClass.schoolYearId) !== input.schoolYearId) { response.status(400).json({ error: 'Select a class in the chosen school year' }); return; }
    if (!term || String(term.schoolYearId) !== input.schoolYearId) { response.status(400).json({ error: 'Select a term in the chosen school year' }); return; }
    const normalizedLoginCode = input.loginCode.toUpperCase();
    let studentUser = await User.findOne({ loginCode: normalizedLoginCode }).select('_id firstName lastName loginCode');
    if (!studentUser) {
      const legacyStudent = await Student.findOne({ admissionNumber: normalizedLoginCode }).select('userId');
      if (legacyStudent) studentUser = await User.findById(legacyStudent.userId).select('_id firstName lastName loginCode');
    }
    if (!studentUser) { response.status(404).json({ error: 'No student was found with that login code' }); return; }
    const student = await Student.findOne({ userId: studentUser._id }).select('_id classId');
    if (!student) { response.status(404).json({ error: 'That account is not linked to a student profile' }); return; }
    if (!studentUser.loginCode && !await User.exists({ loginCode: normalizedLoginCode, _id: { $ne: studentUser._id } })) {
      studentUser.loginCode = normalizedLoginCode;
      await studentUser.save();
    }
    if (await StudentEnrollment.exists({ studentId: student._id, schoolYearId: input.schoolYearId })) { response.status(409).json({ error: 'This student is already enrolled for that school year' }); return; }
    const roles = await Role.find({ _id: { $in: request.user!.roleIds } }).select('permissions').lean();
    const canManageAll = roles.some((role) => role.permissions.includes('academics:manage'));
    if (!canManageAll) {
      const staff = await Staff.findOne({ userId: request.user!.id, employmentStatus: 'active' }).select('_id');
      if (!staff || String(schoolClass.classTeacherId) !== String(staff._id)) { response.status(403).json({ error: 'You can only enroll students in your assigned class' }); return; }
    }
    const enrollment = await StudentEnrollment.create({ studentId: student._id, schoolYearId: input.schoolYearId, termId: input.termId, classId: input.classId, registeredBy: request.user!.id });
    enrollmentId = enrollment.id;
    student.classId = schoolClass._id;
    await student.save();
    const loginCode = studentUser.loginCode ?? normalizedLoginCode;
    await writeAuditLog({ request, actorId: request.user!.id, action: 'student.re_enrolled', entityType: 'StudentEnrollment', entityId: enrollment.id, after: { studentId: student.id, schoolYearId: input.schoolYearId, termId: input.termId, classId: input.classId, loginCode } });
    response.status(201).json({ enrollment, student: { id: student.id, firstName: studentUser.firstName, lastName: studentUser.lastName, loginCode } });
  } catch (error) {
    if (enrollmentId) await StudentEnrollment.findByIdAndDelete(enrollmentId);
    next(error);
  }
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
