export type AuthUser = {
  id: string
  email: string
  fullName: string
  role: "ADMIN" | "OPERATOR" | "AUDITOR"
}

export type AuthSession = {
  token: string
  user: AuthUser
}

type LoginResponse = {
  success: boolean
  data?: {
    token: string
    user: AuthUser
    expiresIn: string
  }
  error?: string
}

const AUTH_STORAGE_KEY = "rra_connector_auth"
const AUTH_COOKIE_KEY = "connector_auth_token"

export function getAuthCookieName(): string {
  return AUTH_COOKIE_KEY
}

export function parseLoginResponse(payload: LoginResponse): AuthSession {
  if (!payload.success || !payload.data?.token || !payload.data.user) {
    throw new Error(payload.error ?? "Invalid login response")
  }

  return {
    token: payload.data.token,
    user: payload.data.user,
  }
}

export function persistAuthSession(session: AuthSession): void {
  if (typeof window === "undefined") {
    return
  }

  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session))
  document.cookie = `${AUTH_COOKIE_KEY}=${session.token}; path=/; max-age=86400; samesite=lax`
}

export function readAuthSession(): AuthSession | null {
  if (typeof window === "undefined") {
    return null
  }

  const raw = window.localStorage.getItem(AUTH_STORAGE_KEY)

  if (!raw) {
    return null
  }

  try {
    return JSON.parse(raw) as AuthSession
  } catch {
    return null
  }
}

export function clearAuthSession(): void {
  if (typeof window === "undefined") {
    return
  }

  window.localStorage.removeItem(AUTH_STORAGE_KEY)
  document.cookie = `${AUTH_COOKIE_KEY}=; path=/; max-age=0; samesite=lax`
}

export function withAuthHeader(token: string): { Authorization: string } {
  return {
    Authorization: `Bearer ${token}`,
  }
}

export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === "object" && error !== null && "response" in error) {
    const maybeResponse = error as {
      response?: {
        data?: {
          error?: string
          message?: string
        }
      }
    }

    return maybeResponse.response?.data?.error ?? maybeResponse.response?.data?.message ?? fallback
  }

  if (error instanceof Error && error.message) {
    return error.message
  }

  return fallback
}
