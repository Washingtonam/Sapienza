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

export type SchoolYear = { _id: string; name: string; startsAt: string; endsAt: string; status: 'planned' | 'active' | 'closed' };
export type SchoolTerm = { _id: string; schoolYearId: string; name: string; order: number; startsAt?: string; endsAt?: string };
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

export type ManagedMedia = {
  _id: string;
  key: string;
  url: string;
  altText: string;
  section?: string;
  version: number;
  isActive: boolean;
};

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

export function managedMedia() {
  return request<{ media: ManagedMedia[] }>('/content/manage/media');
}

export function saveManagedPage(page: Omit<ManagedPage, '_id'>) {
  return request<{ page: ManagedPage }>('/content/pages', { method: 'POST', body: JSON.stringify(page) });
}

export function saveManagedMedia(media: { key: string; url: string; storageProvider: string; publicId?: string; altText: string; section?: string }) {
  return request<{ media: ManagedMedia }>('/content/media', { method: 'POST', body: JSON.stringify(media) });
}
