// components/UserProvider.tsx
"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { useRouter } from "next/navigation"

export interface User {
  id: string
  nom: string
  prenom: string
  username: string
  email: string | null
  role: "admin" | "doctor"
  telephone?: string | null
}

interface UserContextType {
  user: User | null
  loading: boolean
  logout: () => void
}

const UserContext = createContext<UserContextType | undefined>(undefined)

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Récupérer l'utilisateur du sessionStorage
    const userStr = sessionStorage.getItem("user")
    
    if (userStr) {
      try {
        const parsedUser = JSON.parse(userStr)
        setUser(parsedUser)
      } catch (error) {
        console.error("Erreur lors du parsing de l'utilisateur:", error)
        sessionStorage.removeItem("user")
      }
    } else {
      // Pas d'utilisateur connecté, rediriger vers login
      router.push("/")
    }
    
    setLoading(false)
  }, [router])

  const logout = () => {
    sessionStorage.removeItem("user")
    setUser(null)
    router.push("/")
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-cyan-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 text-sm">Chargement...</p>
        </div>
      </div>
    )
  }

  // Si pas d'utilisateur après chargement, ne pas afficher le children
  // (la redirection a déjà été faite)
  if (!user) {
    return null
  }

  return (
    <UserContext.Provider value={{ user, loading, logout }}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  const context = useContext(UserContext)
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider")
  }
  return context
}