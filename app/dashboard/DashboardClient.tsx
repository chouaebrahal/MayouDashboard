// app/dashboard/DashboardClient.tsx
"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabaseClient"
import { Patient, Doctor, Admin } from "@/types/db"
import {
  Users,
  Stethoscope,
  Shield,
  Calendar,
  FileText,
  CheckCircle,
  Clock,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Phone,
  Video,
  Activity,
  Heart,
  Brain,
  UserPlus,
  UserCheck,
  FileWarning,
  PhoneCall,
  CalendarDays,
  ArrowUpRight,
  ArrowDownRight,
  MoreVertical,
  ChevronRight,
  Sparkles,
  Target,
  Award,
  BarChart3,
  PieChart,
  Download,
  RefreshCw,
} from "lucide-react"

interface DashboardClientProps {
  initialPatients: Patient[]
  initialDoctors: Doctor[]
  initialAdmins: Admin[]
}

interface StatCardProps {
  title: string
  value: number
  icon: React.ReactNode
  color: string
  trend?: number
  subtitle?: string
}

interface StatusDistribution {
  label: string
  count: number
  color: string
}

export default function DashboardClient({ 
  initialPatients, 
  initialDoctors, 
  initialAdmins 
}: DashboardClientProps) {
  const [patients, setPatients] = useState<Patient[]>(initialPatients)
  const [doctors] = useState<Doctor[]>(initialDoctors)
  const [admins] = useState<Admin[]>(initialAdmins)
  const [selectedPeriod, setSelectedPeriod] = useState<"week" | "month" | "year">("month")
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Calcul des statistiques
  const totalPatients = patients.length
  const totalDoctors = doctors.length
  const totalAdmins = admins.length

  // Statistiques des dossiers
  const dossiersComplets = patients.filter(p => p.statut_dossier === "Dossier complet").length
  const dossiersEnAttente = patients.filter(p => p.statut_dossier === "Dossier en préparation").length
  const dossiersRefus = patients.filter(p => p.statut_dossier === "Refus de l'assurance").length
  const dossiersAccordes = patients.filter(p => p.statut_dossier === "Accord de l'assurance").length

  // Statistiques des types de cas
  const chirurgie = patients.filter(p => p.type_de_cas === "Chirurgie").length
  const traitementMedical = patients.filter(p => p.type_de_cas === "Traitement médical").length
  const urgence = patients.filter(p => p.type_de_cas === "Urgence").length
  const atlRealise = patients.filter(p => p.type_de_cas === "Terminé / ATL réalisé").length

  // Statistiques des contacts
  const contactes = patients.filter(p => p.contact === "Contacté").length
  const aAppeler = patients.filter(p => p.contact === "À appeler").length
  const nonJoignable = patients.filter(p => p.contact === "N'est pas joignable").length

  // Statistiques des rendez-vous
  const today = new Date().toISOString().split('T')[0]
  const rendezVousAujourdhui = patients.filter(p => p.date === today).length
  
  const rendezVousSemaine = patients.filter(p => {
    if (!p.date) return false
    const patientDate = new Date(p.date)
    const now = new Date()
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    return patientDate >= now && patientDate <= weekFromNow
  }).length

  // Patients par âge
  const patientsMoins25 = patients.filter(p => (p.age || 0) < 25).length
  const patients25_50 = patients.filter(p => (p.age || 0) >= 25 && (p.age || 0) < 50).length
  const patientsPlus50 = patients.filter(p => (p.age || 0) >= 50).length

  // Taux de complétion des dossiers
  const tauxCompletion = totalPatients > 0 ? Math.round((dossiersComplets / totalPatients) * 100) : 0
  
  // Nouvelles patients ce mois
  const currentMonth = new Date().getMonth()
  const newPatientsThisMonth = patients.filter(p => {
    const patientDate = new Date(p.created_at)
    return patientDate.getMonth() === currentMonth
  }).length

  const StatCard = ({ title, value, icon, color, trend, subtitle }: StatCardProps) => (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all duration-200 group">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500 font-medium">{title}</p>
          <p className="text-3xl font-bold text-slate-800 mt-1">{value.toLocaleString()}</p>
          {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
          {trend !== undefined && (
            <div className={`flex items-center gap-1 mt-2 text-xs ${trend >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {trend >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              <span>{Math.abs(trend)}% ce mois</span>
            </div>
          )}
        </div>
        <div className={`w-12 h-12 rounded-2xl ${color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-200`}>
          {icon}
        </div>
      </div>
    </div>
  )

  const StatusPill = ({ label, count, color }: StatusDistribution) => (
    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${color}`}></div>
        <span className="text-sm text-slate-600">{label}</span>
      </div>
      <span className="font-semibold text-slate-800">{count}</span>
    </div>
  )

  const handleRefresh = async () => {
    setIsRefreshing(true)
    const { data } = await supabase.from("patients").select("*")
    if (data) setPatients(data)
    setTimeout(() => setIsRefreshing(false), 800)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-blue-100/40">
      <div className="p-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles size={20} className="text-amber-500" />
              <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                Tableau de bord
              </h1>
            </div>
            <p className="text-slate-500">
              Vue d'ensemble de votre activité médicale
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex bg-white rounded-xl border border-slate-200 p-1">
              <button
                onClick={() => setSelectedPeriod("week")}
                className={`px-3 py-1.5 text-sm rounded-lg transition ${
                  selectedPeriod === "week" 
                    ? "bg-cyan-600 text-white shadow-sm" 
                    : "text-slate-500 hover:bg-slate-100"
                }`}
              >
                Semaine
              </button>
              <button
                onClick={() => setSelectedPeriod("month")}
                className={`px-3 py-1.5 text-sm rounded-lg transition ${
                  selectedPeriod === "month" 
                    ? "bg-cyan-600 text-white shadow-sm" 
                    : "text-slate-500 hover:bg-slate-100"
                }`}
              >
                Mois
              </button>
              <button
                onClick={() => setSelectedPeriod("year")}
                className={`px-3 py-1.5 text-sm rounded-lg transition ${
                  selectedPeriod === "year" 
                    ? "bg-cyan-600 text-white shadow-sm" 
                    : "text-slate-500 hover:bg-slate-100"
                }`}
              >
                Année
              </button>
            </div>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2.5 bg-white rounded-xl border border-slate-200 text-slate-500 hover:text-cyan-600 hover:border-cyan-200 transition"
            >
              <RefreshCw size={18} className={isRefreshing ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          <StatCard
            title="Total Patients"
            value={totalPatients}
            icon={<Users size={22} className="text-white" />}
            color="bg-gradient-to-br from-cyan-500 to-blue-500"
            trend={totalPatients > 0 ? 12 : 0}
            subtitle={`+${newPatientsThisMonth} ce mois`}
          />
          <StatCard
            title="Médecins"
            value={totalDoctors}
            icon={<Stethoscope size={22} className="text-white" />}
            color="bg-gradient-to-br from-emerald-500 to-teal-500"
          />
          <StatCard
            title="Administrateurs"
            value={totalAdmins}
            icon={<Shield size={22} className="text-white" />}
            color="bg-gradient-to-br from-purple-500 to-indigo-500"
          />
          <StatCard
            title="Taux de complétion"
            value={tauxCompletion}
            icon={<Target size={22} className="text-white" />}
            color="bg-gradient-to-br from-amber-500 to-orange-500"
            subtitle={`${dossiersComplets}/${totalPatients} dossiers complets`}
          />
        </div>

        {/* Second Row Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-slate-500 font-medium">Rendez-vous</p>
              <CalendarDays size={18} className="text-slate-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-800">{rendezVousAujourdhui}</span>
              <span className="text-xs text-slate-400">aujourd'hui</span>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              +{rendezVousSemaine} cette semaine
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-slate-500 font-medium">Contact établi</p>
              <PhoneCall size={18} className="text-slate-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-emerald-600">{contactes}</span>
              <span className="text-xs text-slate-400">patients</span>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 rounded-full"
                  style={{ width: `${totalPatients > 0 ? (contactes / totalPatients) * 100 : 0}%` }}
                />
              </div>
              <span className="text-xs text-slate-400">
                {totalPatients > 0 ? Math.round((contactes / totalPatients) * 100) : 0}%
              </span>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-slate-500 font-medium">À appeler</p>
              <Clock size={18} className="text-slate-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-amber-600">{aAppeler}</span>
              <span className="text-xs text-slate-400">en attente</span>
            </div>
            {nonJoignable > 0 && (
              <p className="text-xs text-rose-500 mt-2">
                {nonJoignable} non joignables
              </p>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-slate-500 font-medium">Dossiers accordés</p>
              <CheckCircle size={18} className="text-slate-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-green-600">{dossiersAccordes}</span>
              <span className="text-xs text-slate-400">assurance</span>
            </div>
            {dossiersRefus > 0 && (
              <p className="text-xs text-rose-500 mt-2">
                {dossiersRefus} refusés
              </p>
            )}
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Distribution des statuts dossier */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                <FileText size={18} className="text-cyan-600" />
                Distribution des dossiers
              </h2>
              <MoreVertical size={16} className="text-slate-400" />
            </div>
            <div className="space-y-2">
              <StatusPill label="Dossier complet" count={dossiersComplets} color="bg-emerald-500" />
              <StatusPill label="Dossier en préparation" count={dossiersEnAttente} color="bg-amber-500" />
              <StatusPill label="Accord de l'assurance" count={dossiersAccordes} color="bg-green-500" />
              <StatusPill label="Refus de l'assurance" count={dossiersRefus} color="bg-rose-500" />
              <StatusPill label="Transmis à l'assurance" count={patients.filter(p => p.statut_dossier === "Transmis à l'assurance").length} color="bg-blue-500" />
              <StatusPill label="Fichiers manquants" count={patients.filter(p => p.statut_dossier === "Fichiers manquants").length} color="bg-orange-500" />
            </div>
          </div>

          {/* Distribution des types de cas */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                <Activity size={18} className="text-purple-600" />
                Types de cas médicaux
              </h2>
            </div>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-600">Chirurgie</span>
                  <span className="font-semibold text-slate-700">{chirurgie}</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${totalPatients > 0 ? (chirurgie / totalPatients) * 100 : 0}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-600">Traitement médical</span>
                  <span className="font-semibold text-slate-700">{traitementMedical}</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-cyan-500 rounded-full" style={{ width: `${totalPatients > 0 ? (traitementMedical / totalPatients) * 100 : 0}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-600">Urgence</span>
                  <span className="font-semibold text-slate-700">{urgence}</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-rose-500 rounded-full" style={{ width: `${totalPatients > 0 ? (urgence / totalPatients) * 100 : 0}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-600">ATL réalisé</span>
                  <span className="font-semibold text-slate-700">{atlRealise}</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${totalPatients > 0 ? (atlRealise / totalPatients) * 100 : 0}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-600">ATL à faire</span>
                  <span className="font-semibold text-slate-700">{patients.filter(p => p.type_de_cas === "ATL à faire").length}</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-orange-500 rounded-full" style={{ width: `${totalPatients > 0 ? (patients.filter(p => p.type_de_cas === "ATL à faire").length / totalPatients) * 100 : 0}%` }} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Third Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Distribution par âge */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                <Heart size={18} className="text-rose-500" />
                Répartition par âge
              </h2>
            </div>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-600">Moins de 25 ans</span>
                  <span className="font-semibold text-slate-700">{patientsMoins25}</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${totalPatients > 0 ? (patientsMoins25 / totalPatients) * 100 : 0}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-600">25 - 50 ans</span>
                  <span className="font-semibold text-slate-700">{patients25_50}</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-teal-500 rounded-full" style={{ width: `${totalPatients > 0 ? (patients25_50 / totalPatients) * 100 : 0}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-600">Plus de 50 ans</span>
                  <span className="font-semibold text-slate-700">{patientsPlus50}</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-purple-500 rounded-full" style={{ width: `${totalPatients > 0 ? (patientsPlus50 / totalPatients) * 100 : 0}%` }} />
                </div>
              </div>
            </div>
          </div>

          {/* Activité récente */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm lg:col-span-2">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                <Activity size={18} className="text-emerald-500" />
                Activité récente
              </h2>
              <button className="text-sm text-cyan-600 hover:text-cyan-700 flex items-center gap-1">
                Voir tout <ChevronRight size={14} />
              </button>
            </div>
            <div className="space-y-3">
              {patients.slice(0, 5).map((patient, index) => (
                <div key={patient.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-100 to-blue-100 flex items-center justify-center">
                      <Users size={14} className="text-cyan-700" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-700">
                        {patient.nom} {patient.prenom}
                      </p>
                      <p className="text-xs text-slate-400">
                        {patient.type_de_cas || "Cas non défini"} • {patient.age || "?"} ans
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      patient.statut_dossier === "Dossier complet" 
                        ? "bg-emerald-100 text-emerald-700" 
                        : patient.statut_dossier === "Dossier en préparation"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-slate-100 text-slate-600"
                    }`}>
                      {patient.statut_dossier || "Statut inconnu"}
                    </span>
                    <p className="text-xs text-slate-400 mt-1">
                      {new Date(patient.created_at).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                </div>
              ))}
              {patients.length === 0 && (
                <div className="text-center py-8">
                  <AlertCircle size={40} className="mx-auto text-slate-300 mb-2" />
                  <p className="text-slate-400">Aucun patient pour le moment</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions Footer */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="font-semibold text-slate-800">Actions rapides</h3>
              <p className="text-sm text-slate-400 mt-0.5">Gérez votre activité quotidienne</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button className="flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-xl text-sm font-medium hover:bg-cyan-700 transition shadow-sm">
                <UserPlus size={16} />
                Nouveau patient
              </button>
              <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50 transition">
                <CalendarDays size={16} />
                Voir les rendez-vous
              </button>
              <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50 transition">
                <Download size={16} />
                Exporter les données
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}