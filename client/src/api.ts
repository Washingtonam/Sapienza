const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api';

export type SessionUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles?: Array<{ name: string; permissions: string[] }>;
};

export type ManagedUser = {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  loginCode?: string;
  status: 'active' | 'suspended' | 'archived';
  roleIds: Array<{ _id: string; name: string }>;
};

export type ManagedRole = { _id: string; name: string; permissions: string[] };

export type AdminDashboard = {
  students: number;
  attendance: Array<{ _id: string; count: number }>;
  invoices: Array<{ _id: string; count: number; balance: number }>;
  finance: { billed: number; collected: number; outstanding: number };
  cbt: { attempts: number; averagePercentage: number };
};

export type AttendanceRecord = {
  _id: string;
  studentId: { _id: string; admissionNumber: string; userId: { firstName: string; lastName: string } } | string;
  classId: string;
  date: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  remarks?: string;
};

export type AssignmentRecord = {
  _id: string;
  title: string;
  description: string;
  subjectId: { _id: string; name: string; code: string } | string;
  classId: string;
  dueAt: string;
  status: 'draft' | 'published' | 'closed';
};

export type AssessmentRecord = {
  _id: string;
  title: string;
  type: 'test' | 'exam' | 'project' | 'assignment';
  subjectId: { _id: string; name: string; code: string } | string;
  classId: string;
  schoolYearId: string;
  term: string;
  maxScore: number;
  published: boolean;
};

export type GradeRecord = {
  _id: string;
  assessmentId: AssessmentRecord | string;
  studentId: string;
  score: number;
  grade?: string;
  remarks?: string;
};

export type SchoolYear = { _id: string; name: string; startsAt: string; endsAt: string; status: 'planned' | 'active' | 'closed' };
export type SchoolTerm = { _id: string; schoolYearId: string; name: string; order: number; startsAt?: string; endsAt?: string };
export type SchoolSubject = { _id: string; name: string; code: string; description?: string };
export type SchoolClass = { _id: string; name: string; level: string; schoolYearId: string; classTeacherId?: string | { _id: string; userId?: { firstName: string; lastName: string } } | null };
export type TeacherStaff = { _id: string; employeeNumber: string; userId: { firstName: string; lastName: string } };
export type StaffRecord = { _id: string; employeeNumber: string; department?: string; jobTitle: string; employmentStatus: 'active' | 'on_leave' | 'ended'; hireDate?: string; userId: { firstName: string; lastName: string; email: string } };
export type SchoolStudent = { _id: string; admissionNumber: string; userId: { firstName: string; lastName: string; email?: string }; classId?: { _id: string; name: string; level: string } };
export type ManagedReportCard = { _id: string; studentId: SchoolStudent; schoolYearId: { _id: string; name: string }; term: string; subjects: Array<{ subjectName: string; average: number; grade: string }>; average: number; position?: number; teacherComment?: string; principalComment?: string; publishedAt?: string };
export type EnrollmentClass = { _id: string; name: string; level: string; schoolYearId: { _id: string; name: string; status: SchoolYear['status'] } };
export type ClassEnrollment = { _id: string; studentId: { _id: string; admissionNumber: string; userId: { firstName: string; lastName: string; loginCode: string } }; termId: string };
export type FinanceClass = { _id: string; name: string; level: string; schoolYearId: { _id: string; name: string; status: SchoolYear['status'] } };
export type FinanceStudent = { _id: string; admissionNumber: string; userId: { firstName: string; lastName: string }; classId?: { _id: string; name: string; level: string } };
export type FeeStructureRecord = { _id: string; name: string; schoolYearId: { _id: string; name: string; status: SchoolYear['status'] }; classId: { _id: string; name: string; level: string }; items: Array<{ name: string; amount: number }>; totalAmount: number; dueDate: string };
export type FinanceInvoice = { _id: string; studentId: FinanceStudent; feeStructureId: { _id: string; name: string; totalAmount: number }; amount: number; amountPaid: number; balance: number; status: 'unpaid' | 'partial' | 'paid' | 'overdue'; dueDate: string };
export type StudentInvoice = { _id: string; feeStructureId: { _id: string; name: string; totalAmount: number }; amount: number; amountPaid: number; balance: number; status: 'unpaid' | 'partial' | 'paid' | 'overdue'; dueDate: string };
export type PaymentTransaction = { _id: string; studentId: FinanceStudent | null; invoiceId: { _id: string; amount: number; amountPaid: number; balance: number; status: string; dueDate: string; feeStructureId?: { name: string } } | null; amount: number; provider: string; transactionReference: string; status: 'pending' | 'successful' | 'failed' | 'refunded'; paidAt?: string; createdAt: string };
export type StudentReportCard = {
  _id: string;
  studentId: { _id: string; userId?: { firstName: string; lastName: string }; admissionNumber?: string };
  schoolYearId: { _id: string; name: string };
  term: string;
  subjects: Array<{ subjectName: string; average: number; grade: string }>;
  average: number;
  position?: number;
  teacherComment?: string;
  principalComment?: string;
  publishedAt: string;
};

export type ManagedPage = {
  _id: string;
  slug: string;
  title: string;
  sections: Array<{ key: string; heading?: string; body?: string; mediaKey?: string; order?: number }>;
  status: 'draft' | 'published';
};

export type NoticeRecord = {
  _id: string;
  title: string;
  body: string;
  category: string;
  audience: 'public' | 'students' | 'parents' | 'staff' | 'alumni';
  publishAt: string;
  expiresAt?: string;
  status: 'draft' | 'published' | 'archived';
  createdAt?: string;
  updatedAt?: string;
};

export type ThemePresetId = 'wine-and-beige' | 'midnight-ivory' | 'forest-gold' | 'sage-cream';
export type SchoolSettings = {
  themePreset: ThemePresetId;
  schoolName: string;
  tagline: string;
  palette: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
    muted: string;
  };
};

export const themePresets: Record<ThemePresetId, { name: string; palette: SchoolSettings['palette'] }> = {
  'wine-and-beige': { name: 'Wine & Beige', palette: { primary: '#4F1D2F', secondary: '#F4E9D8', accent: '#B77A59', background: '#F8F4EE', text: '#1F2937', muted: '#5F6C6D' } },
  'midnight-ivory': { name: 'Midnight Ivory', palette: { primary: '#0F172A', secondary: '#F8F5F0', accent: '#C084FC', background: '#F4F1EE', text: '#0F172A', muted: '#475569' } },
  'forest-gold': { name: 'Forest Gold', palette: { primary: '#173C35', secondary: '#F3EAD5', accent: '#C79D4A', background: '#F5F3EE', text: '#1C2A22', muted: '#4B5C52' } },
  'sage-cream': { name: 'Sage Cream', palette: { primary: '#355C4F', secondary: '#F5F1E7', accent: '#B67852', background: '#F7F5F0', text: '#23362F', muted: '#58716B' } }
};

export type ManagedMedia = {
  _id: string;
  key: string;
  url: string;
  altText: string;
  section?: string;
  version: number;
  isActive: boolean;
};

export type SchoolLogo = Pick<ManagedMedia, 'url' | 'altText'>;

async function request<T>(path: string, options: RequestInit = {}) {
  const token = localStorage.getItem('sapienza.token');
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error ?? 'Something went wrong');
  return data as T;
}

export function login(identifier: string, password: string) {
  return request<{ token: string; user: SessionUser }>('/auth/login', { method: 'POST', body: JSON.stringify({ identifier, password }) });
}

export function register(firstName: string, lastName: string, email: string, password: string) {
  return request<{ token: string; user: SessionUser }>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ firstName, lastName, email, password })
  });
}

export function enrollmentClasses() {
  return request<{ classes: EnrollmentClass[] }>('/academics/enrollment-classes');
}

export function classEnrollments(classId: string, schoolYearId: string) {
  const query = new URLSearchParams({ classId, schoolYearId });
  return request<{ enrollments: ClassEnrollment[] }>(`/academics/enrollments?${query}`);
}

export function enrollStudent(input: { firstName: string; lastName: string; password: string; admissionDate: string; schoolYearId: string; termId: string; classId: string; dateOfBirth?: string; gender?: 'female' | 'male' | 'other' | 'undisclosed'; address?: string }) {
  return request<{ student: { id: string; firstName: string; lastName: string; loginCode: string } }>('/academics/enrollments', { method: 'POST', body: JSON.stringify(input) });
}

export function reenrollStudent(input: { loginCode: string; schoolYearId: string; termId: string; classId: string }) {
  return request<{ student: { id: string; firstName: string; lastName: string; loginCode: string } }>('/academics/enrollments/returning', { method: 'POST', body: JSON.stringify(input) });
}

export function currentUser() {
  return request<{ user: SessionUser }>('/auth/me');
}

export function adminDashboard() {
  return request<AdminDashboard>('/operations/dashboard');
}

export function recordsAttendance(filters: { classId?: string; date?: string } = {}) {
  const query = new URLSearchParams(Object.entries(filters).filter((entry): entry is [string, string] => Boolean(entry[1]))).toString();
  return request<{ attendance: AttendanceRecord[] }>(`/records/attendance${query ? `?${query}` : ''}`);
}

export function saveAttendance(input: { studentId: string; classId: string; date: string; status: AttendanceRecord['status']; remarks?: string }) {
  return request<{ attendance: AttendanceRecord }>('/records/attendance', { method: 'POST', body: JSON.stringify(input) });
}

export function recordsAssignments(classId?: string) {
  const query = classId ? `?classId=${encodeURIComponent(classId)}` : '';
  return request<{ assignments: AssignmentRecord[] }>(`/records/assignments${query}`);
}

export function createRecordAssignment(input: { title: string; description: string; subjectId: string; classId: string; dueAt: string; status: AssignmentRecord['status'] }) {
  return request<{ assignment: AssignmentRecord }>('/records/assignments', { method: 'POST', body: JSON.stringify(input) });
}

export function submitRecordAssignment(input: { assignmentId: string; answerText: string }) {
  return request<{ submission: { _id: string; status: string; submittedAt?: string } }>('/records/assignment-submissions', { method: 'POST', body: JSON.stringify({ ...input, status: 'submitted' }) });
}

export function recordsAssessments(classId?: string) {
  const query = classId ? `?classId=${encodeURIComponent(classId)}` : '';
  return request<{ assessments: AssessmentRecord[] }>(`/records/assessments${query}`);
}

export function createRecordAssessment(input: { title: string; type: AssessmentRecord['type']; subjectId: string; classId: string; schoolYearId: string; term: string; maxScore: number; published: boolean }) {
  return request<{ assessment: AssessmentRecord }>('/records/assessments', { method: 'POST', body: JSON.stringify(input) });
}

export function recordsGrades() {
  return request<{ grades: GradeRecord[] }>('/records/grades');
}

export function saveRecordGrade(input: { assessmentId: string; studentId: string; score: number; grade?: string; remarks?: string }) {
  return request<{ grade: GradeRecord }>('/records/grades', { method: 'POST', body: JSON.stringify(input) });
}

export async function downloadOperationsReport(report: 'attendance' | 'invoices' | 'cbt-results') {
  const token = localStorage.getItem('sapienza.token');
  const response = await fetch(`${API_URL}/operations/exports/${report}.csv`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({})) as { error?: string };
    throw new Error(data.error ?? 'Unable to download report');
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${report}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function financeClasses() {
  return request<{ classes: FinanceClass[] }>('/finance/classes');
}

export function financeStudents() {
  return request<{ students: FinanceStudent[] }>('/finance/students');
}

export function feeStructures() {
  return request<{ feeStructures: FeeStructureRecord[] }>('/finance/fee-structures');
}

export function financeInvoices() {
  return request<{ invoices: FinanceInvoice[] }>('/finance/invoices');
}

export function financePayments() {
  return request<{ payments: PaymentTransaction[] }>('/finance/payments');
}

export function createFeeStructure(input: { name: string; schoolYearId: string; classId: string; items: Array<{ name: string; amount: number }>; dueDate: string }) {
  return request<{ feeStructure: FeeStructureRecord }>('/finance/fee-structures', { method: 'POST', body: JSON.stringify(input) });
}

export function createFinanceInvoice(studentId: string, feeStructureId: string) {
  return request<{ invoice: FinanceInvoice }>('/finance/invoices', { method: 'POST', body: JSON.stringify({ studentId, feeStructureId }) });
}

export function myInvoices() {
  return request<{ invoices: StudentInvoice[] }>('/finance/my-invoices');
}

export function initializeInvoicePayment(invoiceId: string, amount?: number) {
  return request<{ payment: PaymentTransaction; authorizationUrl?: string | null; publicKey?: string | null; email?: string; reference: string; message?: string }>('/finance/payments/initialize', {
    method: 'POST',
    body: JSON.stringify({ invoiceId, amount })
  });
}

export function verifyInvoicePayment(reference: string) {
  return request<{ payment: PaymentTransaction; verified: boolean; status: string }>('/finance/payments/verify', {
    method: 'POST',
    body: JSON.stringify({ reference })
  });
}

export function managedUsers() {
  return request<{ users: ManagedUser[] }>('/admin/users');
}

export function assignUserRoles(userId: string, roleIds: string[]) {
  return request<{ userId: string; roleIds: string[] }>(`/admin/users/${encodeURIComponent(userId)}/roles`, {
    method: 'PATCH',
    body: JSON.stringify({ roleIds })
  });
}

export function managedRoles() {
  return request<{ roles: ManagedRole[] }>('/admin/roles');
}

export function createStaffAccount(input: { firstName: string; lastName: string; email: string; password: string; roleName: 'teacher' | 'bursar' | 'registrar'; employeeNumber: string; jobTitle: string; department?: string; hireDate?: string }) {
  return request<{ user: { id: string; firstName: string; lastName: string; email: string } }>('/admin/users/staff', { method: 'POST', body: JSON.stringify(input) });
}

export function schoolYears() {
  return request<{ schoolYears: SchoolYear[] }>('/academics/school-years');
}

export function schoolTerms(schoolYearId?: string) {
  const query = schoolYearId ? `?schoolYearId=${encodeURIComponent(schoolYearId)}` : '';
  return request<{ terms: SchoolTerm[] }>(`/academics/terms${query}`);
}

export function schoolSubjects() {
  return request<{ subjects: SchoolSubject[] }>('/academics/subjects');
}

export function schoolClasses(schoolYearId?: string) {
  const query = schoolYearId ? `?schoolYearId=${encodeURIComponent(schoolYearId)}` : '';
  return request<{ classes: SchoolClass[] }>(`/academics/classes${query}`);
}

export function schoolTeachers() {
  return request<{ teachers: TeacherStaff[] }>('/academics/teachers');
}

export function schoolStaff() {
  return request<{ staff: StaffRecord[] }>('/academics/staff');
}

export function schoolStudents() {
  return request<{ students: SchoolStudent[] }>('/academics/students');
}

export function schoolReportCards() {
  return request<{ reportCards: ManagedReportCard[] }>('/records/report-cards');
}

export function publishReportCard(studentId: string, input: { schoolYearId: string; term: string; teacherComment?: string; principalComment?: string }) {
  return request<{ reportCard: ManagedReportCard }>(`/records/report-cards/${encodeURIComponent(studentId)}/publish`, { method: 'POST', body: JSON.stringify(input) });
}

export function createSchoolYear(input: { name: string; startsAt: string; endsAt: string; status: SchoolYear['status'] }) {
  return request<{ schoolYear: SchoolYear }>('/academics/school-years', { method: 'POST', body: JSON.stringify(input) });
}

export function createSchoolTerm(input: { name: string; schoolYearId: string; order: number; startsAt?: string; endsAt?: string }) {
  return request<{ term: SchoolTerm }>('/academics/terms', { method: 'POST', body: JSON.stringify(input) });
}

export function createSchoolClass(input: { name: string; level: string; schoolYearId: string; classTeacherId?: string }) {
  return request<{ class: SchoolClass }>('/academics/classes', { method: 'POST', body: JSON.stringify(input) });
}

export function assignClassTeacher(classId: string, classTeacherId: string | null) {
  return request<{ class: SchoolClass }>(`/academics/classes/${encodeURIComponent(classId)}/teacher`, { method: 'PATCH', body: JSON.stringify({ classTeacherId }) });
}

export function myReportCards(filters: { schoolYearId?: string; term?: string; studentId?: string } = {}) {
  const query = new URLSearchParams(Object.entries(filters).filter((entry): entry is [string, string] => Boolean(entry[1]))).toString();
  return request<{ reportCards: StudentReportCard[] }>(`/records/my-report-cards${query ? `?${query}` : ''}`);
}

export function publicContent() {
  return Promise.all([
    request<{ notices: Array<{ title: string; body: string; category: string }> }>('/content/notices'),
    request<{ media: Array<{ key: string; url: string; altText: string }> }>('/content/media')
  ]);
}

export function publishedPages() {
  return request<{ pages: ManagedPage[] }>('/content/pages');
}

export function publicPage(slug: string) {
  return request<{ page: ManagedPage }>(`/content/pages/${encodeURIComponent(slug)}`);
}

export function publicMedia() {
  return request<{ media: Array<{ key: string; url: string; altText: string }> }>('/content/media');
}

export function currentSchoolSettings() {
  return request<{ settings: SchoolSettings }>('/content/settings');
}

export function saveSchoolSettings(input: Partial<SchoolSettings>) {
  return request<{ settings: SchoolSettings }>('/content/settings', { method: 'PUT', body: JSON.stringify(input) });
}

export async function uploadImageToCloudinary(file: File) {
  const signature = await request<{ cloudName: string; apiKey: string; timestamp: number; folder: string; signature: string }>('/content/media/upload-signature', {
    method: 'POST',
    body: JSON.stringify({})
  });
  const form = new FormData();
  form.append('file', file);
  form.append('api_key', signature.apiKey);
  form.append('timestamp', String(signature.timestamp));
  form.append('folder', signature.folder);
  form.append('signature', signature.signature);
  const response = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(signature.cloudName)}/image/upload`, { method: 'POST', body: form });
  const result = await response.json().catch(() => ({})) as { secure_url?: string; public_id?: string; error?: { message?: string } };
  if (!response.ok || !result.secure_url || !result.public_id) throw new Error(result.error?.message ?? 'Image upload failed');
  return { url: result.secure_url, publicId: result.public_id };
}

export function managedPages() {
  return request<{ pages: ManagedPage[] }>('/content/manage/pages');
}

export function managedNotices() {
  return request<{ notices: NoticeRecord[] }>('/content/manage/notices');
}

export function managedMedia() {
  return request<{ media: ManagedMedia[] }>('/content/manage/media');
}

export function saveManagedPage(page: Omit<ManagedPage, '_id'>) {
  return request<{ page: ManagedPage }>('/content/pages', { method: 'POST', body: JSON.stringify(page) });
}

export function saveNotice(input: { title: string; body: string; category: string; audience: NoticeRecord['audience']; publishAt: string; expiresAt?: string; status: NoticeRecord['status'] }) {
  return request<{ notice: NoticeRecord }>('/content/notices', { method: 'POST', body: JSON.stringify(input) });
}

export function saveManagedMedia(media: { key: string; url: string; storageProvider: string; publicId?: string; altText: string; section?: string }) {
  return request<{ media: ManagedMedia }>('/content/media', { method: 'POST', body: JSON.stringify(media) });
}

export type CbtExamRecord = {
  _id: string;
  title: string;
  instructions?: string;
  subjectId?: { _id: string; name: string; code?: string } | string;
  classId?: { _id: string; name: string; level?: string } | string;
  durationMinutes: number;
  startsAt: string;
  endsAt: string;
  status: 'draft' | 'scheduled' | 'open' | 'closed';
  published?: boolean;
};

export type CbtQuestionRecord = {
  id: string;
  questionText: string;
  type: 'multiple_choice' | 'true_false' | 'short_answer';
  options: string[];
  points: number;
  order: number;
};

export function cbtExams(classId?: string) {
  const query = classId ? `?classId=${encodeURIComponent(classId)}` : '';
  return request<{ exams: CbtExamRecord[] }>(`/cbt/exams${query}`);
}

export function cbtExamQuestions(examId: string) {
  return request<{ exam: CbtExamRecord; questions: CbtQuestionRecord[] }>(`/cbt/exams/${encodeURIComponent(examId)}/questions`);
}

export function createCbtExam(input: { title: string; instructions?: string; subjectId: string; classId: string; durationMinutes: number; startsAt: string; endsAt: string; status?: CbtExamRecord['status']; published?: boolean }) {
  return request<{ exam: CbtExamRecord }>('/cbt/exams', { method: 'POST', body: JSON.stringify(input) });
}

export function addCbtQuestion(examId: string, input: { questionText: string; type: CbtQuestionRecord['type']; options?: string[]; correctAnswer: string; points: number; order: number }) {
  return request<{ question: CbtQuestionRecord }>(`/cbt/exams/${encodeURIComponent(examId)}/questions`, { method: 'POST', body: JSON.stringify(input) });
}

export function startCbtExam(examId: string) {
  return request<{ attempt: { id: string; startedAt: string; status: string } }>(`/cbt/exams/${encodeURIComponent(examId)}/start`, { method: 'POST', body: JSON.stringify({}) });
}

export function submitCbtExam(attemptId: string, answers: Array<{ questionId: string; answer?: string }>) {
  return request<{ result: { attemptId: string; score: number; maxScore: number; percentage: number; status: string; submittedAt?: string } }>(`/cbt/attempts/${encodeURIComponent(attemptId)}/submit`, { method: 'POST', body: JSON.stringify({ answers }) });
}

export function myCbtResults() {
  return request<{ results: Array<{ _id: string; examId?: { _id: string; title: string; subjectId?: { name: string; code?: string } }; score?: number; maxScore?: number; percentage?: number; status?: string; createdAt?: string; submittedAt?: string }> }>('/cbt/my-results');
}

export function cbtExamResults(examId: string) {
  return request<{ results: Array<{ _id: string; studentId?: { _id: string; userId?: { firstName: string; lastName: string } }; score?: number; maxScore?: number; percentage?: number; status?: string }> }>(`/cbt/exams/${encodeURIComponent(examId)}/results`);
}
