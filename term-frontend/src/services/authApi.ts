export type AuthUser = {
  username: string
  role: 'user' | 'admin'
  display_name: string
}

export type LoginResult = {
  token: string
  user: AuthUser
}

export const AUTH_STORAGE_KEY = 'termbase-auth'

function parseStoredAuth(): LoginResult | null {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY)
    if (!raw) return null
    const value = JSON.parse(raw) as Partial<LoginResult>
    if (typeof value.token !== 'string' || !value.user) return null
    if (value.user.role !== 'user' && value.user.role !== 'admin') return null
    return value as LoginResult
  } catch {
    localStorage.removeItem(AUTH_STORAGE_KEY)
    return null
  }
}

export function getStoredAuth(): LoginResult | null {
  return parseStoredAuth()
}

export function saveStoredAuth(auth: LoginResult) {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth))
}

export function clearStoredAuth() {
  localStorage.removeItem(AUTH_STORAGE_KEY)
}

export function getAuthToken(): string | null {
  return parseStoredAuth()?.token ?? null
}

async function unwrap<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => ({}))
  if (!response.ok || payload.code >= 400) {
    throw new Error(payload.message || '认证请求失败')
  }
  return payload.data as T
}

export async function loginRequest(username: string, password: string): Promise<LoginResult> {
  const response = await fetch('/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  return unwrap<LoginResult>(response)
}

export async function registerRequest(username: string, password: string, displayName: string): Promise<LoginResult> {
  const response = await fetch('/api/v1/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, display_name: displayName }),
  })
  return unwrap<LoginResult>(response)
}

export async function getCurrentUser(): Promise<AuthUser> {
  const token = getAuthToken()
  if (!token) throw new Error('请先登录')
  const response = await fetch('/api/v1/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
  })
  return unwrap<AuthUser>(response)
}
