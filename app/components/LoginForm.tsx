// components/LoginForm.tsx
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import { 
  Stethoscope, 
  User, 
  Lock, 
  Eye, 
  EyeOff, 
  Shield, 
  Activity,
  Sparkles,
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
      let user = null
      let table = userType === "admin" ? "admins" : "doctors"

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
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-blue-100/50 flex items-center justify-center p-4">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-cyan-200/30 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-200/30 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-200/20 rounded-full blur-3xl"></div>
      </div>

      <div className="relative w-full max-w-6xl">
        <div className="grid md:grid-cols-2 gap-0 bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200/60">
          
          {/* Left side - Branding */}
          <div className="bg-gradient-to-br from-cyan-700 via-blue-700 to-indigo-800 p-8 md:p-12 flex flex-col justify-between text-white">
            <div>
              <div className="flex items-center gap-3 mb-8">
                <div className="bg-white/20 p-2.5 rounded-2xl backdrop-blur-sm">
                  <Stethoscope size={28} className="text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">MayouDashboard</h1>
                  <p className="text-cyan-200 text-sm">Système de gestion médicale</p>
                </div>
              </div>
              
              <div className="space-y-6 mt-12">
                <div className="flex items-start gap-3">
                  <div className="bg-white/20 p-2 rounded-xl">
                    <Shield size={18} className="text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Accès sécurisé</h3>
                    <p className="text-cyan-100 text-sm">Connexion sécurisée pour administrateurs et médecins</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="bg-white/20 p-2 rounded-xl">
                    <Activity size={18} className="text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Gestion centralisée</h3>
                    <p className="text-cyan-100 text-sm">Gérez tous vos patients et dossiers depuis un seul endroit</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="bg-white/20 p-2 rounded-xl">
                    <Sparkles size={18} className="text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Interface moderne</h3>
                    <p className="text-cyan-100 text-sm">Une expérience utilisateur fluide et professionnelle</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-8 pt-8 border-t border-white/20">
              <p className="text-cyan-100 text-xs">
                © 2026 MayouDashboard - Tous droits réservés 
              </p>
            </div>
          </div>

          {/* Right side - Login Form */}
          <div className="p-8 md:p-12 bg-white">
            <div className="max-w-md mx-auto w-full">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-slate-900">Connexion</h2>
                <p className="text-slate-600 mt-1 font-medium">Accédez à votre espace de travail</p>
              </div>

              {/* User Type Toggle */}
              <div className="flex gap-2 p-1 bg-slate-100 rounded-xl mb-6">
                <button
                  type="button"
                  onClick={() => setUserType("admin")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium transition-all duration-200 ${
                    userType === "admin"
                      ? "bg-white text-cyan-700 shadow-sm ring-1 ring-slate-200"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <Shield size={16} />
                  Administrateur
                </button>
                <button
                  type="button"
                  onClick={() => setUserType("doctor")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium transition-all duration-200 ${
                    userType === "doctor"
                      ? "bg-white text-cyan-700 shadow-sm ring-1 ring-slate-200"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <Stethoscope size={16} />
                  Médecin
                </button>
              </div>

              <form onSubmit={handleLogin} className="space-y-5">
                {/* Username Field */}
                <div>
                  <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                    Nom d'utilisateur
                  </label>
                  <div className="relative">
                    <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500 transition text-slate-900 font-medium placeholder:text-slate-400"
                      placeholder="Entrez votre nom d'utilisateur"
                      required
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div>
                  <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                    Mot de passe
                  </label>
                  <div className="relative">
                    <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-12 py-2.5 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500 transition text-slate-900 font-medium placeholder:text-slate-400"
                      placeholder="Entrez votre mot de passe"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 transition"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700">
                    <AlertCircle size={16} />
                    <span className="text-sm">{error}</span>
                  </div>
                )}

                {/* Success Message */}
                {successMessage && (
                  <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700">
                    <CheckCircle size={16} />
                    <span className="text-sm">{successMessage}</span>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-semibold rounded-xl shadow-lg shadow-cyan-500/25 hover:shadow-xl hover:scale-[1.02] transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Connexion...
                    </>
                  ) : (
                    <>
                      <Activity size={18} />
                      Se connecter
                    </>
                  )}
                </button>

               
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}