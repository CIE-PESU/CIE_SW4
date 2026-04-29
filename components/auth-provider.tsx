"use client"

import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"

export type UserRole = "ADMIN" | "FACULTY" | "STUDENT"

export interface User {
  id: string
  email: string
  name: string
  image?: string
  role: UserRole
  phone?: string
  join_date: Date
  student_id?: string
  studentClass?: string
  section?: string
  profileData?: any
}

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
  isLoading: boolean
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const logout = useCallback(() => {
    setUser(null)
    localStorage.removeItem("cie-user")
  }, []);

  const refreshUserData = useCallback(async (userId: string) => {
    try {
      const response = await fetch("/api/auth/me", {
        headers: {
          "x-user-id": userId,
        },
      })

      if (response.ok) {
        const { user: userData } = await response.json()
        setUser(userData)
        localStorage.setItem("cie-user", JSON.stringify(userData))
      } else if (response.status === 404 || response.status === 401) {
        // If user not found or session invalid, clear the session
        console.warn("User session invalid, logging out")
        logout()
      }
      // On other errors (e.g. 500), keep the existing session — don't log out
    } catch (error) {
      // Network error — keep the existing local session, don't log the user out
      console.error("Error refreshing user data:", error)
    }
  }, [logout]);

  useEffect(() => {
    // Check for stored user session
    const storedUser = localStorage.getItem("cie-user")
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser)
        setUser(userData)
        // Refresh user data from server in background
        refreshUserData(userData.id)
      } catch (error) {
        console.error("Error parsing stored user:", error)
        localStorage.removeItem("cie-user")
      }
    }
    setIsLoading(false)
  }, [refreshUserData])

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    try {
      console.log("Attempting login for:", email)
      
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      })

      console.log("Login response status:", response.status)

      if (response.ok) {
        const { user: userData } = await response.json()
        console.log("Login successful, user data:", userData)
        // Set user directly — no null-then-set hack needed
        setUser(userData)
        localStorage.setItem("cie-user", JSON.stringify(userData))
        return true
      } else {
        const { error } = await response.json()
        console.error("Login error:", error)
        return false
      }
    } catch (error) {
      console.error("Login error:", error)
      return false
    }
  }, []);

  const refreshUser = useCallback(async () => {
    if (user) {
      await refreshUserData(user.id)
    }
  }, [user, refreshUserData]);

  const value = React.useMemo(() => ({
    user,
    login,
    logout,
    isLoading,
    refreshUser
  }), [user, login, logout, isLoading, refreshUser]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>

}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
