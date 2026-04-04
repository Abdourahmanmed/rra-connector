"use client"

import { useRouter } from "next/navigation"
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"

import {
  clearAuthSession,
  getApiErrorMessage,
  parseLoginResponse,
  persistAuthSession,
  readAuthSession,
  type AuthSession,
  type AuthUser,
  withAuthHeader,
} from "@/lib/auth"
import { apiClient } from "@/lib/api/client"

type LoginInput = {
  email: string
  password: string
}

type MeResponse = {
  success: boolean
  data?: AuthUser
}

type AuthContextValue = {
  user: AuthUser | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (input: LoginInput) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [session, setSession] = useState<AuthSession | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const hydrateSession = useCallback(async () => {
    const storedSession = readAuthSession()

    if (!storedSession?.token) {
      setIsLoading(false)
      return
    }

    try {
      const response = await apiClient.get<MeResponse>("/api/auth/me", {
        headers: withAuthHeader(storedSession.token),
      })

      if (!response.data.success || !response.data.data) {
        throw new Error("Invalid auth state")
      }

      const nextSession = {
        token: storedSession.token,
        user: response.data.data,
      }

      setSession(nextSession)
      persistAuthSession(nextSession)
    } catch {
      clearAuthSession()
      setSession(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void hydrateSession()
  }, [hydrateSession])

  const login = useCallback(async (input: LoginInput) => {
    const response = await apiClient.post("/api/auth/login", input)
    const nextSession = parseLoginResponse(response.data)

    persistAuthSession(nextSession)
    setSession(nextSession)
  }, [])

  const logout = useCallback(async () => {
    try {
      if (session?.token) {
        await apiClient.post(
          "/api/auth/logout",
          {},
          {
            headers: withAuthHeader(session.token),
          }
        )
      }
    } catch {
      // no-op
    } finally {
      clearAuthSession()
      setSession(null)
      router.push("/login")
    }
  }, [router, session?.token])

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      token: session?.token ?? null,
      isAuthenticated: Boolean(session?.token),
      isLoading,
      login: async (input: LoginInput) => {
        try {
          await login(input)
        } catch (error) {
          throw new Error(getApiErrorMessage(error, "Unable to login"))
        }
      },
      logout,
    }),
    [isLoading, login, logout, session?.token, session?.user]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }

  return context
}
