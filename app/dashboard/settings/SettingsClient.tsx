// app/dashboard/settings/SettingsClient.tsx
"use client"

import { useState, useEffect } from "react"
import { useUser } from "@/app/components/UserProvider"
import { supabase } from "@/lib/supabaseClient"
import {
  User,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  Save,
  Shield,
  Bell,
  Moon,
  Sun,
  Globe,
  Languages,
  Printer,
  Download,
  AlertCircle,
  CheckCircle,
  Loader2,
  UserCircle2,
  Calendar,
  Smartphone,
  ChevronRight,
  LogOut,
  X
} from "lucide-react"

export default function SettingsClient() {
  const { user, logout } = useUser()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    nom: "",
    prenom: "",
    email: "",
    telephone: "",
    username: ""
  })
  
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  })
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  
  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    smsNotifications: false,
    appointmentReminders: true
  })

  useEffect(() => {
    if (user) {
      setFormData({
        nom: user.nom || "",
        prenom: user.prenom || "",
        email: user.email || "",
        telephone: user.telephone || "",
        username: user.username || ""
      })
    }
  }, [user])

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    const table = user?.role === "admin" ? "admins" : "doctors"
    
    const { error: updateError } = await supabase
      .from(table)
      .update({
        nom: formData.nom,
        prenom: formData.prenom,
        email: formData.email,
        telephone: formData.telephone,
        username: formData.username
      })
      .eq("id", user?.id)

    if (updateError) {
      setError("Erreur lors de la mise à jour du profil")
    } else {
      setSuccess("Profil mis à jour avec succès")
      const updatedUser = { ...user, ...formData }
      sessionStorage.setItem("user", JSON.stringify(updatedUser))
      setTimeout(() => setSuccess(null), 3000)
    }
    setLoading(false)
  }

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError("Les nouveaux mots de passe ne correspondent pas")
      setLoading(false)
      return
    }

    if (passwordData.newPassword.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères")
      setLoading(false)
      return
    }

    const table = user?.role === "admin" ? "admins" : "doctors"
    
    const { data: userData, error: fetchError } = await supabase
      .from(table)
      .select("password")
      .eq("id", user?.id)
      .single()

    if (fetchError || userData?.password !== passwordData.currentPassword) {
      setError("Mot de passe actuel incorrect")
      setLoading(false)
      return
    }

    const { error: updateError } = await supabase
      .from(table)
      .update({ password: passwordData.newPassword })
      .eq("id", user?.id)

    if (updateError) {
      setError("Erreur lors de la mise à jour du mot de passe")
    } else {
      setSuccess("Mot de passe mis à jour avec succès")
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
      })
      setTimeout(() => setSuccess(null), 3000)
    }
    setLoading(false)
  }

  const InputField = ({ label, name, type = "text", value, onChange, placeholder, icon, required = false }: any) => (
    <div>
      <label className="block text-sm font-semibold text-slate-700 mb-1.5">{label}</label>
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
            {icon}
          </div>
        )}
        <input
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          className={`w-full ${icon ? 'pl-10' : 'pl-4'} pr-4 py-2.5 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-slate-800 font-medium transition`}
        />
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-blue-100/40">
      <div className="max-w-5xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-800 mb-1">Paramètres</h1>
          <p className="text-slate-600">Gérez vos informations personnelles et les préférences de votre compte</p>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <div className="mb-6 p-4 bg-emerald-100 border border-emerald-300 rounded-xl flex items-center gap-2 text-emerald-800 font-medium">
            <CheckCircle size={18} />
            <span>{success}</span>
            <button onClick={() => setSuccess(null)} className="ml-auto">
              <X size={16} />
            </button>
          </div>
        )}
        
        {error && (
          <div className="mb-6 p-4 bg-rose-100 border border-rose-300 rounded-xl flex items-center gap-2 text-rose-800 font-medium">
            <AlertCircle size={18} />
            <span>{error}</span>
            <button onClick={() => setError(null)} className="ml-auto">
              <X size={16} />
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm sticky top-8">
              <div className="text-center">
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-cyan-600 to-blue-600 flex items-center justify-center mx-auto shadow-lg">
                  <UserCircle2 size={48} className="text-white" />
                </div>
                <h3 className="mt-4 text-xl font-bold text-slate-800">
                  {user?.prenom} {user?.nom}
                </h3>
                <p className="text-sm text-slate-600 font-medium mt-1">
                  {user?.role === "admin" ? "Administrateur" : "Médecin"}
                </p>
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <div className="flex items-center justify-between text-sm py-2">
                    <span className="text-slate-600 font-medium">Nom d'utilisateur</span>
                    <span className="font-bold text-slate-800">@{user?.username}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm py-2">
                    <span className="text-slate-600 font-medium">Email</span>
                    <span className="font-medium text-slate-700 truncate max-w-[150px]">{user?.email || "—"}</span>
                  </div>
                  {user?.role === "doctor" && (
                    <div className="flex items-center justify-between text-sm py-2">
                      <span className="text-slate-600 font-medium">Téléphone</span>
                      <span className="font-medium text-slate-700">{user?.telephone || "—"}</span>
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={logout}
                className="mt-6 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-100 text-rose-700 rounded-xl font-semibold hover:bg-rose-200 transition"
              >
                <LogOut size={16} />
                Déconnexion
              </button>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Profile Information */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                <div className="flex items-center gap-2">
                  <User size={18} className="text-cyan-700" />
                  <h2 className="font-bold text-slate-800">Informations personnelles</h2>
                </div>
              </div>
              <div className="p-6">
                <form onSubmit={handleProfileUpdate} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <InputField
                      label="Nom"
                      name="nom"
                      value={formData.nom}
                      onChange={(e: any) => setFormData({ ...formData, nom: e.target.value })}
                      placeholder="Votre nom"
                      icon={<User size={16} />}
                      required
                    />
                    <InputField
                      label="Prénom"
                      name="prenom"
                      value={formData.prenom}
                      onChange={(e: any) => setFormData({ ...formData, prenom: e.target.value })}
                      placeholder="Votre prénom"
                      icon={<User size={16} />}
                      required
                    />
                  </div>
                  <InputField
                    label="Nom d'utilisateur"
                    name="username"
                    value={formData.username}
                    onChange={(e: any) => setFormData({ ...formData, username: e.target.value })}
                    placeholder="Nom d'utilisateur"
                    icon={<User size={16} />}
                    required
                  />
                  <InputField
                    label="Email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={(e: any) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="votre@email.com"
                    icon={<Mail size={16} />}
                  />
                  {user?.role === "doctor" && (
                    <InputField
                      label="Téléphone"
                      name="telephone"
                      value={formData.telephone}
                      onChange={(e: any) => setFormData({ ...formData, telephone: e.target.value })}
                      placeholder="06 12 34 56 78"
                      icon={<Phone size={16} />}
                    />
                  )}
                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex items-center gap-2 px-5 py-2.5 bg-cyan-700 text-white rounded-xl font-semibold hover:bg-cyan-800 transition disabled:opacity-50 shadow-md"
                    >
                      {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                      Enregistrer
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Change Password */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                <div className="flex items-center gap-2">
                  <Lock size={18} className="text-amber-700" />
                  <h2 className="font-bold text-slate-800">Changer le mot de passe</h2>
                </div>
              </div>
              <div className="p-6">
                <form onSubmit={handlePasswordUpdate} className="space-y-4">
                  <div className="relative">
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Mot de passe actuel</label>
                    <div className="relative">
                      <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input
                        type={showCurrentPassword ? "text" : "password"}
                        value={passwordData.currentPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                        placeholder="Votre mot de passe actuel"
                        className="w-full pl-10 pr-12 py-2.5 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-slate-800 font-medium"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                      >
                        {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  
                  <div className="relative">
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nouveau mot de passe</label>
                    <div className="relative">
                      <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input
                        type={showNewPassword ? "text" : "password"}
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                        placeholder="Nouveau mot de passe (min. 6 caractères)"
                        className="w-full pl-10 pr-12 py-2.5 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-slate-800 font-medium"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                      >
                        {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  
                  <div className="relative">
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Confirmer le nouveau mot de passe</label>
                    <div className="relative">
                      <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        value={passwordData.confirmPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                        placeholder="Confirmez votre nouveau mot de passe"
                        className="w-full pl-10 pr-12 py-2.5 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-slate-800 font-medium"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                      >
                        {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex items-center gap-2 px-5 py-2.5 bg-amber-600 text-white rounded-xl font-semibold hover:bg-amber-700 transition disabled:opacity-50 shadow-md"
                    >
                      {loading ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />}
                      Changer le mot de passe
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Notifications */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                <div className="flex items-center gap-2">
                  <Bell size={18} className="text-purple-700" />
                  <h2 className="font-bold text-slate-800">Notifications</h2>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <label className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-3">
                    <Mail size={16} className="text-slate-500" />
                    <span className="text-slate-700 font-medium">Notifications par email</span>
                  </div>
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={notifications.emailNotifications}
                      onChange={(e) => setNotifications({ ...notifications, emailNotifications: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-300 rounded-full peer peer-checked:bg-cyan-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                  </div>
                </label>
                <label className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-3">
                    <Smartphone size={16} className="text-slate-500" />
                    <span className="text-slate-700 font-medium">Notifications par SMS</span>
                  </div>
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={notifications.smsNotifications}
                      onChange={(e) => setNotifications({ ...notifications, smsNotifications: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-300 rounded-full peer peer-checked:bg-cyan-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                  </div>
                </label>
                <label className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-3">
                    <Calendar size={16} className="text-slate-500" />
                    <span className="text-slate-700 font-medium">Rappels de rendez-vous</span>
                  </div>
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={notifications.appointmentReminders}
                      onChange={(e) => setNotifications({ ...notifications, appointmentReminders: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-300 rounded-full peer peer-checked:bg-cyan-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                  </div>
                </label>
              </div>
            </div>

            {/* Export Data */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                <div className="flex items-center gap-2">
                  <Download size={18} className="text-green-700" />
                  <h2 className="font-bold text-slate-800">Données</h2>
                </div>
              </div>
              <div className="p-6 space-y-3">
                <button className="w-full flex items-center justify-between p-3 bg-slate-100 rounded-xl hover:bg-slate-200 transition">
                  <div className="flex items-center gap-3">
                    <Download size={16} className="text-slate-600" />
                    <span className="text-slate-700 font-medium">Exporter mes données</span>
                  </div>
                  <ChevronRight size={16} className="text-slate-500" />
                </button>
                <button className="w-full flex items-center justify-between p-3 bg-slate-100 rounded-xl hover:bg-slate-200 transition">
                  <div className="flex items-center gap-3">
                    <Printer size={16} className="text-slate-600" />
                    <span className="text-slate-700 font-medium">Imprimer le rapport d'activité</span>
                  </div>
                  <ChevronRight size={16} className="text-slate-500" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}