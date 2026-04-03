export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'employee';
  telegramChatId?: string;
  avatarUrl?: string;
}

export function getUser(): User | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem('user');
  return stored ? JSON.parse(stored) : null;
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('access_token');
}

export function setAuth(token: string, user: User): void {
  localStorage.setItem('access_token', token);
  localStorage.setItem('user', JSON.stringify(user));
}

export function clearAuth(): void {
  localStorage.removeItem('access_token');
  localStorage.removeItem('user');
}

export function isAdmin(): boolean {
  return getUser()?.role === 'admin';
}
