const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api';

export type SessionUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles?: Array<{ name: string; permissions: string[] }>;
};

export type AdminDashboard = {
  students: number;
  attendance: Array<{ _id: string; count: number }>;
  invoices: Array<{ _id: string; count: number; balance: number }>;
  finance: { billed: number; collected: number; outstanding: number };
  cbt: { attempts: number; averagePercentage: number };
};

export type SchoolYear = { _id: string; name: string; startsAt: string; endsAt: string; status: 'planned' | 'active' | 'closed' };
export type SchoolTerm = { _id: string; schoolYearId: string; name: string; order: number; startsAt?: string; endsAt?: string };
export type SchoolClass = { _id: string; name: string; level: string; schoolYearId: string };
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

export function login(email: string, password: string) {
  return request<{ token: string; user: SessionUser }>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
}

export function register(firstName: string, lastName: string, email: string, password: string) {
  return request<{ token: string; user: SessionUser }>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ firstName, lastName, email, password })
  });
}

export function currentUser() {
  return request<{ user: SessionUser }>('/auth/me');
}

export function adminDashboard() {
  return request<AdminDashboard>('/operations/dashboard');
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

export function createSchoolYear(input: { name: string; startsAt: string; endsAt: string; status: SchoolYear['status'] }) {
  return request<{ schoolYear: SchoolYear }>('/academics/school-years', { method: 'POST', body: JSON.stringify(input) });
}

export function createSchoolTerm(input: { name: string; schoolYearId: string; order: number; startsAt?: string; endsAt?: string }) {
  return request<{ term: SchoolTerm }>('/academics/terms', { method: 'POST', body: JSON.stringify(input) });
}

export function createSchoolClass(input: { name: string; level: string; schoolYearId: string }) {
  return request<{ class: SchoolClass }>('/academics/classes', { method: 'POST', body: JSON.stringify(input) });
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

export function managedPages() {
  return request<{ pages: ManagedPage[] }>('/content/manage/pages');
}

export function managedMedia() {
  return request<{ media: ManagedMedia[] }>('/content/manage/media');
}

export function saveManagedPage(page: Omit<ManagedPage, '_id'>) {
  return request<{ page: ManagedPage }>('/content/pages', { method: 'POST', body: JSON.stringify(page) });
}

export function saveManagedMedia(media: { key: string; url: string; storageProvider: string; altText: string; section?: string }) {
  return request<{ media: ManagedMedia }>('/content/media', { method: 'POST', body: JSON.stringify(media) });
}
