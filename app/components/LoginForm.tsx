// components/LoginForm.tsx
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import ThemeToggle from "./ThemeToggle"
import { 
  Stethoscope, 
  User, 
  Lock, 
  Eye, 
  EyeOff, 
  Shield, 
  Activity,
  AlertCircle,
  Loader2,
  CheckCircle
} from "lucide-react"

export default function LoginForm() {
  const router = useRouter()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [userType, setUserType] = useState<"admin" | "doctor">("admin")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccessMessage(null)

    try {
      const table = userType === "admin" ? "admins" : "doctors"

      // Vérifier les credentials dans la table correspondante
      const { data, error: queryError } = await supabase
        .from(table)
        .select("*")
        .eq("username", username)
        .single()

      if (queryError || !data) {
        setError("Nom d'utilisateur incorrect")
        setLoading(false)
        return
      }

      // Vérifier le mot de passe (comparaison directe car stocké en clair)
      if (data.password !== password) {
        setError("Mot de passe incorrect")
        setLoading(false)
        return
      }

      // Connexion réussie - stocker les infos utilisateur dans sessionStorage
      const userSession = {
        id: data.id,
        nom: data.nom,
        prenom: data.prenom,
        username: data.username,
        email: data.email,
        role: userType,
        ...(userType === "doctor" && { telephone: data.telephone })
      }

      sessionStorage.setItem("user", JSON.stringify(userSession))
      
      setSuccessMessage(`Bienvenue ${data.prenom} ${data.nom} ! Redirection...`)
      
      // Redirection vers dashboard après un court délai
      setTimeout(() => {
        router.push("/dashboard")
        router.refresh()
      }, 1500)

    } catch (err) {
      setError("Une erreur est survenue. Veuillez réessayer.")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="app-background relative isolate flex min-h-svh items-center justify-center px-4 py-8 sm:px-6 sm:py-10">
      {/* Background decorative elements */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-cyan-200/30 blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-blue-200/30 blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-purple-200/20 blur-3xl"></div>
      </div>

      <div className="relative w-full max-w-md">
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-900/5 sm:rounded-3xl sm:p-8">
          <ThemeToggle className="absolute right-4 top-4 sm:right-5 sm:top-5" />

          {/* Brand */}
          <div className="flex flex-col items-center text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-600/25">
              <Stethoscope size={28} aria-hidden="true" />
            </div>
            <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">
              MayouDashboard
            </h1>
            <p className="mt-1 text-sm font-medium text-slate-500">
              Système de gestion médicale
            </p>
          </div>

          <div className="mt-6 border-t border-slate-200 pt-6">
            <div className="text-center">
              <h2 className="text-lg font-semibold tracking-tight text-slate-900">
                Connexion
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Accédez à votre espace de travail
              </p>
            </div>

            {/* User Type Toggle */}
            <div className="mt-6 flex gap-2 rounded-xl bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setUserType("admin")}
                aria-pressed={userType === "admin"}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 font-medium transition-all duration-200 ${
                  userType === "admin"
                    ? "bg-white text-cyan-700 shadow-sm ring-1 ring-slate-200"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <Shield size={16} aria-hidden="true" />
                <span className="hidden sm:inline">Administrateur</span>
                <span className="sm:hidden">Admin</span>
              </button>
              <button
                type="button"
                onClick={() => setUserType("doctor")}
                aria-pressed={userType === "doctor"}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 font-medium transition-all duration-200 ${
                  userType === "doctor"
                    ? "bg-white text-cyan-700 shadow-sm ring-1 ring-slate-200"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <Stethoscope size={16} aria-hidden="true" />
                Médecin
              </button>
            </div>

            <form onSubmit={handleLogin} className="mt-6 space-y-5">
              {/* Username Field */}
              <div>
                <label
                  htmlFor="login-username"
                  className="mb-1.5 block text-sm font-semibold text-slate-800"
                >
                  Nom d&apos;utilisateur
                </label>
                <div className="relative">
                  <User
                    size={18}
                    aria-hidden="true"
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                  />
                  <input
                    id="login-username"
                    name="username"
                    type="text"
                    autoComplete="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-4 font-medium text-slate-900 transition placeholder:text-slate-400 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                    placeholder="Entrez votre nom d'utilisateur"
                    required
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <label
                  htmlFor="login-password"
                  className="mb-1.5 block text-sm font-semibold text-slate-800"
                >
                  Mot de passe
                </label>
                <div className="relative">
                  <Lock
                    size={18}
                    aria-hidden="true"
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                  />
                  <input
                    id="login-password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-12 font-medium text-slate-900 transition placeholder:text-slate-400 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                    placeholder="Entrez votre mot de passe"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                    title={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-0.5 text-slate-500 transition hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-600"
                  >
                    {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
                  </button>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div
                  role="alert"
                  className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-rose-700"
                >
                  <AlertCircle size={16} aria-hidden="true" />
                  <span className="text-sm">{error}</span>
                </div>
              )}

              {/* Success Message */}
              {successMessage && (
                <div
                  role="status"
                  className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-emerald-700"
                >
                  <CheckCircle size={16} aria-hidden="true" />
                  <span className="text-sm">{successMessage}</span>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 py-2.5 font-semibold text-white shadow-lg shadow-cyan-500/25 transition-all duration-200 hover:shadow-xl hover:brightness-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-600 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? (
                  <>
                    <Loader2 size={18} aria-hidden="true" className="animate-spin" />
                    Connexion...
                  </>
                ) : (
                  <>
                    <Activity size={18} aria-hidden="true" />
                    Se connecter
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-slate-500">
          © 2026 MayouDashboard — Tous droits réservés
        </p>
      </div>
    </main>
  )
}
