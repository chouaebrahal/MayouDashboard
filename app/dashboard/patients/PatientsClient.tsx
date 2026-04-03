// app/patients/PatientsClient.tsx
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import { Patient } from "@/types/db"
import {
  Search,
  Plus,
  Filter,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Edit,
  Phone,
  Calendar,
  XCircle,
  AlertCircle,
  Loader2,
  User,
  PhoneCall,
  PhoneOff,
  PhoneIncoming,
  Trash2,
  UserPlus,
  RefreshCw,
  Eye,
  ChevronDown,
} from "lucide-react"

interface PatientsClientProps {
  initialPatients: Patient[]
}

type SortField = "nom" | "prenom" | "created_at" | "date" | "statut_dossier" | "type_de_cas" | "age"
type SortOrder = "asc" | "desc"

const STATUT_DOSSIER_OPTIONS = [
  "Dossier complet",
  "Fichiers manquants",
  "Refus de l'assurance",
  "Accord de l'assurance",
  "Transmis à l'assurance",
  "Dossier en préparation",
  "Statut inconnu",
]

const TYPE_CAS_OPTIONS = [
  "Non défini",
  "Chirurgie",
  "Traitement médical",
  "Terminé / ATL réalisé",
  "ATL à faire",
  "Urgence",
  "Consultation",
  "Suivi post-op",
]

const CONTACT_STATUS_OPTIONS = [
  "Contacté",
  "À appeler",
  "N'est pas joignable",
  "Rendez-vous pris",
  "En attente de retour",
]

// Couleurs plus contrastées pour les statuts
const statusColors: Record<string, string> = {
  "Dossier complet": "bg-emerald-600 text-white border-emerald-700",
  "Fichiers manquants": "bg-amber-600 text-white border-amber-700",
  "Refus de l'assurance": "bg-rose-700 text-white border-rose-800",
  "Accord de l'assurance": "bg-green-700 text-white border-green-800",
  "Transmis à l'assurance": "bg-blue-700 text-white border-blue-800",
  "Dossier en préparation": "bg-purple-700 text-white border-purple-800",
  "Statut inconnu": "bg-gray-600 text-white border-gray-700",
}

const typeCasColors: Record<string, string> = {
  "Non défini": "bg-slate-600 text-white",
  "Chirurgie": "bg-indigo-700 text-white",
  "Traitement médical": "bg-cyan-700 text-white",
  "Terminé / ATL réalisé": "bg-emerald-700 text-white",
  "ATL à faire": "bg-orange-700 text-white",
  "Urgence": "bg-rose-700 text-white",
  "Consultation": "bg-blue-700 text-white",
  "Suivi post-op": "bg-teal-700 text-white",
}

const contactColors: Record<string, string> = {
  "Contacté": "bg-green-700 text-white",
  "À appeler": "bg-yellow-600 text-white",
  "N'est pas joignable": "bg-red-700 text-white",
  "Rendez-vous pris": "bg-purple-700 text-white",
  "En attente de retour": "bg-orange-700 text-white",
}

export default function PatientsClient({ initialPatients }: PatientsClientProps) {
  const router = useRouter()
  const [patients, setPatients] = useState<Patient[]>(initialPatients)
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>(initialPatients)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("")
  const [typeCasFilter, setTypeCasFilter] = useState<string>("")
  const [contactFilter, setContactFilter] = useState<string>("")
  const [sortField, setSortField] = useState<SortField>("created_at")
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  const [loading, setLoading] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)

  // Form state for add/edit
  const [formData, setFormData] = useState<Partial<Patient>>({
    nom: "",
    prenom: "",
    age: null,
    telephone: "",
    date: "",
    type_de_cas: "Non défini",
    contact: "À appeler",
    statut_dossier: "Dossier en préparation",
    pieces_manquantes: "",
    notes: "",
    resultat: "",
    referring_doctor: "",
    video_url: "",
  })

  // Filter and sort patients
  useEffect(() => {
    let filtered = [...patients]

    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (p) =>
          p.nom?.toLowerCase().includes(term) ||
          p.prenom?.toLowerCase().includes(term) ||
          p.telephone?.includes(term)
      )
    }

    if (statusFilter) {
      filtered = filtered.filter((p) => p.statut_dossier === statusFilter)
    }

    if (typeCasFilter) {
      filtered = filtered.filter((p) => p.type_de_cas === typeCasFilter)
    }

    if (contactFilter) {
      filtered = filtered.filter((p) => p.contact === contactFilter)
    }

    // Sort avec gestion spéciale pour les dates
    filtered.sort((a, b) => {
      if (sortField === "date") {
        const dateA = a.date ? new Date(a.date).getTime() : 0
        const dateB = b.date ? new Date(b.date).getTime() : 0
        return sortOrder === "asc" ? dateA - dateB : dateB - dateA
      }
      
      if (sortField === "created_at") {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0
        return sortOrder === "asc" ? dateA - dateB : dateB - dateA
      }

      let aVal = a[sortField] || ""
      let bVal = b[sortField] || ""

      if (sortField === "age" && typeof aVal === "number" && typeof bVal === "number") {
        return sortOrder === "asc" ? aVal - bVal : bVal - aVal
      }

      aVal = String(aVal).toLowerCase()
      bVal = String(bVal).toLowerCase()

      return sortOrder === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
    })

    setFilteredPatients(filtered)
    setCurrentPage(1)
  }, [searchTerm, statusFilter, typeCasFilter, contactFilter, sortField, sortOrder, patients])

  const totalPages = Math.ceil(filteredPatients.length / itemsPerPage)
  const paginatedPatients = filteredPatients.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortOrder("asc")
    }
  }

  const handleStatusChange = async (patientId: string, newStatus: string) => {
    setLoading(true)
    const { error } = await supabase
      .from("patients")
      .update({ statut_dossier: newStatus })
      .eq("id", patientId)

    if (!error) {
      setPatients((prev) =>
        prev.map((p) => (p.id === patientId ? { ...p, statut_dossier: newStatus } : p))
      )
    }
    setLoading(false)
    setOpenDropdown(null)
  }

  const handleContactChange = async (patientId: string, newContact: string) => {
    setLoading(true)
    const { error } = await supabase
      .from("patients")
      .update({ contact: newContact })
      .eq("id", patientId)

    if (!error) {
      setPatients((prev) =>
        prev.map((p) => (p.id === patientId ? { ...p, contact: newContact } : p))
      )
    }
    setLoading(false)
    setOpenDropdown(null)
  }

  const handleTypeCasChange = async (patientId: string, newType: string) => {
    setLoading(true)
    const { error } = await supabase
      .from("patients")
      .update({ type_de_cas: newType })
      .eq("id", patientId)

    if (!error) {
      setPatients((prev) =>
        prev.map((p) => (p.id === patientId ? { ...p, type_de_cas: newType } : p))
      )
    }
    setLoading(false)
    setOpenDropdown(null)
  }

  const handleAddPatient = async () => {
    if (!formData.nom || !formData.prenom) {
      alert("Veuillez remplir le nom et le prénom")
      return
    }

    setLoading(true)
    const { data, error } = await supabase
      .from("patients")
      .insert([{
        nom: formData.nom,
        prenom: formData.prenom,
        age: formData.age || null,
        telephone: formData.telephone || null,
        date: formData.date || null,
        type_de_cas: formData.type_de_cas || "Non défini",
        contact: formData.contact || "À appeler",
        statut_dossier: formData.statut_dossier || "Dossier en préparation",
        pieces_manquantes: formData.pieces_manquantes || null,
        notes: formData.notes || null,
        resultat: formData.resultat || null,
        referring_doctor: formData.referring_doctor || null,
        video_url: formData.video_url || null,
      }])
      .select()
      .single()

    if (!error && data) {
      setPatients([data, ...patients])
      setShowAddModal(false)
      setFormData({
        nom: "",
        prenom: "",
        age: null,
        telephone: "",
        date: "",
        type_de_cas: "Non défini",
        contact: "À appeler",
        statut_dossier: "Dossier en préparation",
        pieces_manquantes: "",
        notes: "",
        resultat: "",
        referring_doctor: "",
        video_url: "",
      })
    } else {
      alert("Erreur lors de l'ajout: " + error?.message)
    }
    setLoading(false)
  }

  const handleEditPatient = async () => {
    if (!selectedPatient) return
    setLoading(true)
    const { error } = await supabase
      .from("patients")
      .update({
        nom: formData.nom,
        prenom: formData.prenom,
        age: formData.age,
        telephone: formData.telephone,
        date: formData.date,
        type_de_cas: formData.type_de_cas,
        contact: formData.contact,
        statut_dossier: formData.statut_dossier,
        pieces_manquantes: formData.pieces_manquantes,
        notes: formData.notes,
        resultat: formData.resultat,
        referring_doctor: formData.referring_doctor,
        video_url: formData.video_url,
      })
      .eq("id", selectedPatient.id)

    if (!error) {
      setPatients((prev) =>
        prev.map((p) => (p.id === selectedPatient.id ? { ...p, ...formData } : p))
      )
      setShowEditModal(false)
      setSelectedPatient(null)
    } else {
      alert("Erreur lors de la modification: " + error.message)
    }
    setLoading(false)
  }

  const handleDeletePatient = async (patientId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce patient ?")) return
    setLoading(true)
    const { error } = await supabase.from("patients").delete().eq("id", patientId)

    if (!error) {
      setPatients((prev) => prev.filter((p) => p.id !== patientId))
    }
    setLoading(false)
  }

  const handleViewPatient = (patientId: string) => {
    router.push(`/dashboard/patients/${patientId}`)
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "—"
    return new Date(dateString).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  }

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return "—"
    return new Date(dateString).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getContactIcon = (contact: string | null) => {
    switch (contact) {
      case "Contacté":
        return <PhoneIncoming size={14} className="text-green-300" />
      case "À appeler":
        return <PhoneCall size={14} className="text-yellow-300" />
      case "N'est pas joignable":
        return <PhoneOff size={14} className="text-red-300" />
      default:
        return <Phone size={14} className="text-gray-300" />
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-blue-100/40">
      <div className="p-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
              Patients
            </h1>
            <p className="text-slate-500 mt-1">
              Gérez tous vos patients et leurs dossiers médicaux
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-700 to-blue-700 text-white rounded-2xl font-medium shadow-lg shadow-cyan-500/30 hover:shadow-xl hover:scale-[1.02] transition-all duration-200"
          >
            <UserPlus size={18} />
            Nouveau patient
          </button>
        </div>

        {/* Filters Bar */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-6 shadow-sm">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher par nom, prénom ou téléphone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition text-slate-900 font-medium placeholder-slate-500"
              />
            </div>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition ${
                showFilters ? "bg-cyan-100 text-cyan-700" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <Filter size={16} />
              Filtres
              {(statusFilter || typeCasFilter || contactFilter) && (
                <span className="w-2 h-2 bg-cyan-600 rounded-full"></span>
              )}
            </button>

            <button
              onClick={() => {
                setStatusFilter("")
                setTypeCasFilter("")
                setContactFilter("")
                setSearchTerm("")
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 rounded-xl text-slate-600 hover:bg-slate-200 transition"
            >
              <RefreshCw size={16} />
              Réinitialiser
            </button>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-slate-100">
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">
                  Statut dossier
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 text-slate-800 font-medium shadow-sm transition-colors"
                >
                  <option value="">Tous</option>
                  {STATUT_DOSSIER_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">
                  Type de cas
                </label>
                <select
                  value={typeCasFilter}
                  onChange={(e) => setTypeCasFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 text-slate-800 font-medium shadow-sm transition-colors"
                >
                  <option value="">Tous</option>
                  {TYPE_CAS_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">
                  Statut contact
                </label>
                <select
                  value={contactFilter}
                  onChange={(e) => setContactFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 text-slate-800 font-medium shadow-sm transition-colors"
                >
                  <option value="">Tous</option>
                  {CONTACT_STATUS_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-sm">
            <p className="text-xs text-slate-500">Total patients</p>
            <p className="text-2xl font-bold text-slate-800">{patients.length}</p>
          </div>
          <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-sm">
            <p className="text-xs text-slate-500">Dossiers complets</p>
            <p className="text-2xl font-bold text-emerald-700">
              {patients.filter((p) => p.statut_dossier === "Dossier complet").length}
            </p>
          </div>
          <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-sm">
            <p className="text-xs text-slate-500">En attente</p>
            <p className="text-2xl font-bold text-amber-700">
              {patients.filter((p) => p.statut_dossier === "Dossier en préparation").length}
            </p>
          </div>
          <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-sm">
            <p className="text-xs text-slate-500">Chirurgie</p>
            <p className="text-2xl font-bold text-indigo-700">
              {patients.filter((p) => p.type_de_cas === "Chirurgie").length}
            </p>
          </div>
          <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-sm">
            <p className="text-xs text-slate-500">À appeler</p>
            <p className="text-2xl font-bold text-yellow-700">
              {patients.filter((p) => p.contact === "À appeler").length}
            </p>
          </div>
        </div>

        {/* Patients Table */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-100 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                    <button
                      onClick={() => handleSort("nom")}
                      className="flex items-center gap-1 hover:text-slate-900"
                    >
                      Patient
                      <ArrowUpDown size={12} />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                    <button
                      onClick={() => handleSort("type_de_cas")}
                      className="flex items-center gap-1 hover:text-slate-900"
                    >
                      Type de cas
                      <ArrowUpDown size={12} />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                    <button
                      onClick={() => handleSort("statut_dossier")}
                      className="flex items-center gap-1 hover:text-slate-900"
                    >
                      Statut dossier
                      <ArrowUpDown size={12} />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                    Contact status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                    <button
                      onClick={() => handleSort("date")}
                      className="flex items-center gap-1 hover:text-slate-900"
                    >
                      Date RDV
                      <ArrowUpDown size={12} />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                    <button
                      onClick={() => handleSort("created_at")}
                      className="flex items-center gap-1 hover:text-slate-900"
                    >
                      Créé le
                      <ArrowUpDown size={12} />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-slate-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedPatients.map((patient) => (
                  <tr
                    key={patient.id}
                    className="hover:bg-slate-50 transition group cursor-pointer"
                    onClick={() => handleViewPatient(patient.id)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center shadow-sm">
                          <User size={16} className="text-white" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800">
                            {patient.nom} {patient.prenom}
                          </p>
                          <p className="text-xs text-slate-400">
                            {patient.age} ans • ID: {patient.id?.slice(0, 8)}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-0.5">
                        <a
                          href={`tel:${patient.telephone}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-sm text-slate-700 hover:text-cyan-700 flex items-center gap-1 font-medium"
                        >
                          <Phone size={12} />
                          {patient.telephone || "—"}
                        </a>
                        {patient.referring_doctor && (
                          <p className="text-xs text-slate-400">
                            Dr. {patient.referring_doctor}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="relative">
                        <button
                          onClick={() => setOpenDropdown(openDropdown === `type-${patient.id}` ? null : `type-${patient.id}`)}
                          className={`px-2 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 ${typeCasColors[patient.type_de_cas || "Non défini"]}`}
                        >
                          {patient.type_de_cas || "Non défini"}
                          <ChevronDown size={12} />
                        </button>
                        {openDropdown === `type-${patient.id}` && (
                          <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-lg border border-slate-200 z-20 min-w-[160px]">
                            {TYPE_CAS_OPTIONS.map((opt) => (
                              <button
                                key={opt}
                                onClick={() => handleTypeCasChange(patient.id, opt)}
                                className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 first:rounded-t-lg last:rounded-b-lg text-slate-800 font-medium"
                              >
                                {opt}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="relative">
                        <button
                          onClick={() => setOpenDropdown(openDropdown === `status-${patient.id}` ? null : `status-${patient.id}`)}
                          className={`px-2 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 ${statusColors[patient.statut_dossier || "Statut inconnu"]}`}
                        >
                          {patient.statut_dossier || "Statut inconnu"}
                          <ChevronDown size={12} />
                        </button>
                        {openDropdown === `status-${patient.id}` && (
                          <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-lg border border-slate-200 z-20 min-w-[180px]">
                            {STATUT_DOSSIER_OPTIONS.map((opt) => (
                              <button
                                key={opt}
                                onClick={() => handleStatusChange(patient.id, opt)}
                                className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 first:rounded-t-lg last:rounded-b-lg text-slate-800 font-medium"
                              >
                                {opt}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="relative">
                        <button
                          onClick={() => setOpenDropdown(openDropdown === `contact-${patient.id}` ? null : `contact-${patient.id}`)}
                          className={`px-2 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 ${contactColors[patient.contact || "À appeler"]}`}
                        >
                          {getContactIcon(patient.contact)}
                          {patient.contact || "À appeler"}
                          <ChevronDown size={12} />
                        </button>
                        {openDropdown === `contact-${patient.id}` && (
                          <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-lg border border-slate-200 z-20 min-w-[160px]">
                            {CONTACT_STATUS_OPTIONS.map((opt) => (
                              <button
                                key={opt}
                                onClick={() => handleContactChange(patient.id, opt)}
                                className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 first:rounded-t-lg last:rounded-b-lg text-slate-800 font-medium"
                              >
                                {opt}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-sm text-slate-600">
                        <Calendar size={12} className="text-slate-400" />
                        {formatDate(patient.date)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-slate-500">
                        {formatDateTime(patient.created_at)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => {
                            setSelectedPatient(patient)
                            setFormData(patient)
                            setShowEditModal(true)
                          }}
                          className="p-2 rounded-lg text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 transition"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDeletePatient(patient.id)}
                          className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                        >
                          <Trash2 size={16} />
                        </button>
                        <button
                          onClick={() => handleViewPatient(patient.id)}
                          className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition"
                        >
                          <Eye size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredPatients.length === 0 && (
            <div className="text-center py-12">
              <AlertCircle size={48} className="mx-auto text-slate-300 mb-3" />
              <p className="text-slate-500">Aucun patient trouvé</p>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50">
              <p className="text-sm text-slate-500">
                {filteredPatients.length} patient(s) au total
              </p>
              <div className="flex gap-1">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg text-slate-500 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  <ChevronLeft size={18} />
                </button>
                <span className="px-3 py-1 text-sm text-slate-600">
                  Page {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg text-slate-500 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Patient Modal */}
      {showAddModal && (
        <PatientModal
          title="Nouveau patient"
          formData={formData}
          setFormData={setFormData}
          onSave={handleAddPatient}
          onClose={() => setShowAddModal(false)}
          loading={loading}
        />
      )}

      {/* Edit Patient Modal */}
      {showEditModal && selectedPatient && (
        <PatientModal
          title="Modifier le patient"
          formData={formData}
          setFormData={setFormData}
          onSave={handleEditPatient}
          onClose={() => {
            setShowEditModal(false)
            setSelectedPatient(null)
          }}
          loading={loading}
        />
      )}
    </div>
  )
}

// Patient Modal Component
function PatientModal({
  title,
  formData,
  setFormData,
  onSave,
  onClose,
  loading,
}: {
  title: string
  formData: Partial<Patient>
  setFormData: (data: Partial<Patient>) => void
  onSave: () => void
  onClose: () => void
  loading: boolean
}) {
  const [useDob, setUseDob] = useState(false);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-800">{title}</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 transition">
            <XCircle size={20} className="text-slate-400" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold text-slate-700">Nom *</label>
              <input
                type="text"
                value={formData.nom || ""}
                onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition text-slate-800 font-medium placeholder-slate-400"
                placeholder="Dupont"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700">Prénom *</label>
              <input
                type="text"
                value={formData.prenom || ""}
                onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
                className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition text-slate-800 font-medium placeholder-slate-400"
                placeholder="Jean"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-slate-700">Âge</label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">Par date de naissance</span>
                  <button
                    type="button"
                    onClick={() => setUseDob(!useDob)}
                    className={`w-8 h-4 rounded-full transition-colors relative ${useDob ? 'bg-cyan-500' : 'bg-slate-300'}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 bg-white w-3 h-3 rounded-full transition-transform ${useDob ? 'translate-x-4' : ''}`} />
                  </button>
                </div>
              </div>
              
              {useDob ? (
                <div>
                  <input
                    type="date"
                    onChange={(e) => {
                      const dob = e.target.value;
                      if (dob) {
                        const diffMs = Date.now() - new Date(dob).getTime();
                        const ageDate = new Date(diffMs);
                        const calculatedAge = Math.abs(ageDate.getUTCFullYear() - 1970);
                        setFormData({ ...formData, age: calculatedAge });
                      }
                    }}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500/50 text-slate-800 font-medium placeholder-slate-400"
                  />
                  {formData.age !== null && formData.age !== undefined && (
                    <p className="text-xs font-semibold text-cyan-700 mt-1.5 ml-1">Âge calculé: {formData.age} ans</p>
                  )}
                </div>
              ) : (
                <input
                  type="number"
                  value={formData.age || ""}
                  onChange={(e) => setFormData({ ...formData, age: parseInt(e.target.value) || null })}
                  className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500/50 text-slate-800 font-medium placeholder-slate-400"
                  placeholder="35"
                />
              )}
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700">Téléphone</label>
              <input
                type="tel"
                value={formData.telephone || ""}
                onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500/50 text-slate-800 font-medium placeholder-slate-400"
                placeholder="06 12 34 56 78"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold text-slate-700">Date de rendez-vous</label>
              <input
                type="date"
                value={formData.date || ""}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500/50 text-slate-800 font-medium placeholder-slate-400"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700">Médecin référant</label>
              <input
                type="text"
                value={formData.referring_doctor || ""}
                onChange={(e) => setFormData({ ...formData, referring_doctor: e.target.value })}
                className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500/50 text-slate-800 font-medium placeholder-slate-400"
                placeholder="Dr. Martin"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold text-slate-700">Type de cas</label>
              <select
                value={formData.type_de_cas || "Non défini"}
                onChange={(e) => setFormData({ ...formData, type_de_cas: e.target.value })}
                className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500/50 text-slate-800 font-medium placeholder-slate-400"
              >
                {TYPE_CAS_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700">Statut dossier</label>
              <select
                value={formData.statut_dossier || "Dossier en préparation"}
                onChange={(e) => setFormData({ ...formData, statut_dossier: e.target.value })}
                className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500/50 text-slate-800 font-medium placeholder-slate-400"
              >
                {STATUT_DOSSIER_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-700">Statut contact</label>
            <select
              value={formData.contact || "À appeler"}
              onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
              className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500/50 text-slate-800 font-medium placeholder-slate-400"
            >
              {CONTACT_STATUS_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-700">Lien Document / Vidéo</label>
            <input
              type="url"
              value={formData.video_url || ""}
              onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
              className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500/50 text-slate-800 font-medium placeholder-slate-400"
              placeholder="https://..."
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-700">Pièces manquantes</label>
            <textarea
              value={formData.pieces_manquantes || ""}
              onChange={(e) => setFormData({ ...formData, pieces_manquantes: e.target.value })}
              rows={2}
              className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500/50 resize-none text-slate-800 font-medium placeholder-slate-400"
              placeholder="Carte d'identité, Mutuelle..."
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-700">Notes</label>
            <textarea
              value={formData.notes || ""}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500/50 resize-none text-slate-800 font-medium placeholder-slate-400"
              placeholder="Informations complémentaires..."
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-700">Résultat</label>
            <textarea
              value={formData.resultat || ""}
              onChange={(e) => setFormData({ ...formData, resultat: e.target.value })}
              rows={2}
              className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500/50 resize-none text-slate-800 font-medium placeholder-slate-400"
              placeholder="Résultat des examens..."
            />
          </div>
        </div>

        <div className="sticky bottom-0 bg-white border-t border-slate-100 px-6 py-4 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-slate-600 font-medium hover:bg-slate-100 transition"
          >
            Annuler
          </button>
          <button
            onClick={onSave}
            disabled={loading || !formData.nom || !formData.prenom}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-700 to-blue-700 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition flex items-center gap-2"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  )
}