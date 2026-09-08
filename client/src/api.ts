const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api';

export type SessionUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles?: Array<{ name: string; permissions: string[] }>;
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

export function publicContent() {
  return Promise.all([
    request<{ notices: Array<{ title: string; body: string; category: string }> }>('/content/notices'),
    request<{ media: Array<{ key: string; url: string; altText: string }> }>('/content/media')
  ]);
}
