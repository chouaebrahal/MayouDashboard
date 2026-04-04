// app/patients/[id]/PatientDetailsClient.tsx
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import { Patient } from "@/types/db"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import {
  ArrowLeft,
  Edit,
  Save,
  X,
  Phone,
  Calendar,
  FileText,
  Stethoscope,
  AlertCircle,
  CheckCircle,
  Clock,
  User,
  Mail,
  Building,
  Video,
  Download,
  Printer,
  Trash2,
  Loader2,
  ChevronDown,
} from "lucide-react"

interface PatientDetailsClientProps {
  patient: Patient
}

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

const statusColors: Record<string, string> = {
  "Dossier complet": "bg-emerald-600 text-white",
  "Fichiers manquants": "bg-amber-600 text-white",
  "Refus de l'assurance": "bg-rose-700 text-white",
  "Accord de l'assurance": "bg-green-700 text-white",
  "Transmis à l'assurance": "bg-blue-700 text-white",
  "Dossier en préparation": "bg-purple-700 text-white",
  "Statut inconnu": "bg-gray-600 text-white",
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

// ── Stable sub-components (defined outside the parent to preserve identity) ──

function InfoRow({ label, value, icon }: { label: string; value: string | null; icon?: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-slate-100">
      <div className="w-8 text-slate-400">{icon}</div>
      <div className="flex-1">
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{label}</p>
        <p className="text-slate-700 font-medium mt-0.5">{value || "—"}</p>
      </div>
    </div>
  )
}

interface EditFieldProps {
  label: string
  name: keyof Patient
  type?: string
  options?: string[]
  formData: Partial<Patient>
  setFormData: React.Dispatch<React.SetStateAction<Partial<Patient>>>
}

function EditField({ label, name, type = "text", options, formData, setFormData }: EditFieldProps) {
  return (
    <div className="flex flex-col gap-1 py-1">
      {label && <label className="text-xs font-semibold text-slate-600">{label}</label>}
      {options ? (
        <select
          value={(formData[name] as string | number) || ""}
          onChange={(e) => setFormData((prev) => ({ ...prev, [name]: e.target.value }))}
          className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500/50 text-slate-800 font-medium shadow-sm transition-colors"
        >
          {options.map((opt: string) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      ) : type === "textarea" ? (
        <textarea
          value={(formData[name] as string | number) || ""}
          onChange={(e) => setFormData((prev) => ({ ...prev, [name]: e.target.value }))}
          rows={3}
          className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500/50 resize-none text-slate-800 font-medium shadow-sm transition-colors"
        />
      ) : (
        <input
          type={type}
          value={(formData[name] as string | number) || ""}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              [name]: type === "number" ? parseInt(e.target.value) || null : e.target.value,
            }))
          }
          className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500/50 text-slate-800 font-medium shadow-sm transition-colors"
        />
      )}
    </div>
  )
}

export default function PatientDetailsClient({ patient: initialPatient }: PatientDetailsClientProps) {
  const router = useRouter()
  const [patient, setPatient] = useState<Patient>(initialPatient)
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<Partial<Patient>>(initialPatient)

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

  const handlePrintPdf = () => {
    const doc = new jsPDF()
    
    // Modern minimalist header
    doc.setFontSize(24)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(30, 41, 59) // Slate-800
    doc.text("Dossier Patient", 14, 22)
    
    doc.setFontSize(10)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(100, 116, 139) // Slate-500
    doc.text("ClinicFlow", 14, 28)
    
    doc.setLineWidth(0.5)
    doc.setDrawColor(226, 232, 240) // Slate-200
    doc.line(14, 32, 196, 32)
    
    // Patient Identity Section
    doc.setFontSize(16)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(15, 23, 42) // Slate-900
    doc.text(`${patient.nom} ${patient.prenom}`, 14, 42)
    
    doc.setFontSize(10)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(100, 116, 139) // Slate-500
    doc.text(`ID: ${patient.id}`, 14, 48)
    doc.text(`Créé le: ${formatDateTime(patient.created_at)}`, 14, 53)

    // Informations générales with modern minimal table
    autoTable(doc, {
      startY: 62,
      head: [], // No header row to keep it clean
      body: [
        ['Âge', patient.age ? `${patient.age} ans` : '—'],
        ['Téléphone', patient.telephone || '—'],
        ['Date de RDV', formatDate(patient.date)],
        ['Médecin référant', patient.referring_doctor || '—'],
        ['Type de cas', patient.type_de_cas || '—'],
        ['Statut du dossier', patient.statut_dossier || '—'],
        ['Statut de contact', patient.contact || '—'],
      ],
      theme: 'plain',
      styles: { 
        fontSize: 10,
        cellPadding: 4,
        textColor: [51, 65, 85] // Slate-700
      },
      columnStyles: {
        0: { fontStyle: 'bold', textColor: [15, 23, 42], cellWidth: 50 },
        1: { textColor: [71, 85, 105] } // Slate-600
      },
      didDrawCell: (data) => {
        // Add minimal bottom border to rows
        if (data.row.index < data.table.body.length - 1) {
          doc.setDrawColor(241, 245, 249) // Slate-100
          doc.setLineWidth(0.1)
          doc.line(data.cell.x, data.cell.y + data.cell.height, data.cell.x + data.cell.width, data.cell.y + data.cell.height)
        }
      }
    })

    // Sections de textes longs
    const finalY = (doc as any).lastAutoTable.finalY || 62
    let currentY = finalY + 15
    
    const addSection = (title: string, content: string | null | undefined) => {
      if (!content || content.trim() === "") return // Only add section if there is content
      
      if (currentY > 260) {
        doc.addPage()
        currentY = 20
      }
      
      doc.setFontSize(12)
      doc.setFont("helvetica", "bold")
      doc.setTextColor(15, 23, 42) // Slate-900
      doc.text(title.toUpperCase(), 14, currentY)
      
      // Minimal section underline
      doc.setDrawColor(226, 232, 240) // Slate-200
      doc.setLineWidth(0.5)
      doc.line(14, currentY + 2, 80, currentY + 2)
      
      currentY += 8
      doc.setFontSize(10)
      doc.setFont("helvetica", "normal")
      doc.setTextColor(71, 85, 105) // Slate-600
      
      const textLines = doc.splitTextToSize(content, 180)
      doc.text(textLines, 14, currentY)
      currentY += textLines.length * 5 + 12
    }

    addSection("Pièces Manquantes", patient.pieces_manquantes)
    addSection("Notes Médicales", patient.notes)
    addSection("Résultat", patient.resultat)

    // Footer
    const pageCount = (doc as any).internal.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setFontSize(8)
      doc.setTextColor(148, 163, 184) // Slate-400
      doc.text(
        `ClinicFlow — Imprimé le ${new Date().toLocaleDateString('fr-FR')} — Page ${i} sur ${pageCount}`,
        doc.internal.pageSize.getWidth() / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      )
    }
    
    // Save PDF
    doc.save(`dossier_patient_${patient.nom?.replace(/\s+/g, '_') || 'Inconnu'}_${patient.prenom?.replace(/\s+/g, '_') || 'Inconnu'}.pdf`)
  }

  const handleSave = async () => {
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
      .eq("id", patient.id)

    if (!error) {
      setPatient({ ...patient, ...formData })
      setIsEditing(false)
    } else {
      alert("Erreur lors de la modification: " + error.message)
    }
    setLoading(false)
  }

  const handleDelete = async () => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce patient ? Cette action est irréversible.")) return
    
    setLoading(true)
    const { error } = await supabase.from("patients").delete().eq("id", patient.id)

    if (!error) {
      router.push("/patients")
    } else {
      alert("Erreur lors de la suppression: " + error.message)
    }
    setLoading(false)
  }

  const handleStatusChange = async (newStatus: string) => {
    setLoading(true)
    const { error } = await supabase
      .from("patients")
      .update({ statut_dossier: newStatus })
      .eq("id", patient.id)

    if (!error) {
      setPatient({ ...patient, statut_dossier: newStatus })
      if (isEditing) setFormData({ ...formData, statut_dossier: newStatus })
    }
    setLoading(false)
  }

  const handleContactChange = async (newContact: string) => {
    setLoading(true)
    const { error } = await supabase
      .from("patients")
      .update({ contact: newContact })
      .eq("id", patient.id)

    if (!error) {
      setPatient({ ...patient, contact: newContact })
      if (isEditing) setFormData({ ...formData, contact: newContact })
    }
    setLoading(false)
  }

  const handleTypeCasChange = async (newType: string) => {
    setLoading(true)
    const { error } = await supabase
      .from("patients")
      .update({ type_de_cas: newType })
      .eq("id", patient.id)

    if (!error) {
      setPatient({ ...patient, type_de_cas: newType })
      if (isEditing) setFormData({ ...formData, type_de_cas: newType })
    }
    setLoading(false)
  }

  // InfoRow and EditField are defined outside the component (see below)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-blue-100/40">
      <div className="p-8">
        {/* Header with navigation */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition"
          >
            <ArrowLeft size={18} />
            Retour
          </button>
          <div className="flex gap-2">
            {!isEditing ? (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-xl font-medium hover:bg-cyan-700 transition shadow-sm"
                >
                  <Edit size={16} />
                  Modifier
                </button>
                <button
                  onClick={handleDelete}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-xl font-medium hover:bg-rose-700 transition shadow-sm"
                >
                  <Trash2 size={16} />
                  Supprimer
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => {
                    setIsEditing(false)
                    setFormData(patient)
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-300 transition"
                >
                  <X size={16} />
                  Annuler
                </button>
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition shadow-sm"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  Enregistrer
                </button>
              </>
            )}
          </div>
        </div>

        {/* Main content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column - Patient Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header Card */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="bg-gradient-to-r from-cyan-600 to-blue-600 px-6 py-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                    <User size={32} className="text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-white">
                      {patient.nom} {patient.prenom}
                    </h1>
                    <p className="text-cyan-100">ID: {patient.id?.slice(0, 8)}</p>
                  </div>
                </div>
              </div>
              
              <div className="p-6">
                {!isEditing ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InfoRow label="Âge" value={patient.age ? `${patient.age} ans` : null} icon={<Calendar size={16} />} />
                    <InfoRow label="Téléphone" value={patient.telephone} icon={<Phone size={16} />} />
                    <InfoRow label="Date de rendez-vous" value={formatDate(patient.date)} icon={<Calendar size={16} />} />
                    <InfoRow label="Médecin référant" value={patient.referring_doctor} icon={<Stethoscope size={16} />} />
                    <InfoRow label="Date de création" value={formatDateTime(patient.created_at)} icon={<Clock size={16} />} />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <EditField label="Nom" name="nom" formData={formData} setFormData={setFormData} />
                    <EditField label="Prénom" name="prenom" formData={formData} setFormData={setFormData} />
                    <EditField label="Âge" name="age" type="number" formData={formData} setFormData={setFormData} />
                    <EditField label="Téléphone" name="telephone" formData={formData} setFormData={setFormData} />
                    <EditField label="Date de rendez-vous" name="date" type="date" formData={formData} setFormData={setFormData} />
                    <EditField label="Médecin référant" name="referring_doctor" formData={formData} setFormData={setFormData} />
                  </div>
                )}
              </div>
            </div>

            {/* Status Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Type de cas */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Type de cas</p>
                {!isEditing ? (
                  <select
                    value={patient.type_de_cas || "Non défini"}
                    onChange={(e) => handleTypeCasChange(e.target.value)}
                    className={`mt-2 px-3 py-1.5 rounded-lg text-sm font-semibold ${typeCasColors[patient.type_de_cas || "Non défini"]} cursor-pointer border-0`}
                    disabled={loading}
                  >
                    {TYPE_CAS_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                ) : (
                  <EditField label="" name="type_de_cas" options={TYPE_CAS_OPTIONS} formData={formData} setFormData={setFormData} />
                )}
              </div>

              {/* Statut dossier */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Statut dossier</p>
                {!isEditing ? (
                  <select
                    value={patient.statut_dossier || "Statut inconnu"}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    className={`mt-2 px-3 py-1.5 rounded-lg text-sm font-semibold ${statusColors[patient.statut_dossier || "Statut inconnu"]} cursor-pointer border-0`}
                    disabled={loading}
                  >
                    {STATUT_DOSSIER_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                ) : (
                  <EditField label="" name="statut_dossier" options={STATUT_DOSSIER_OPTIONS} formData={formData} setFormData={setFormData} />
                )}
              </div>

              {/* Contact status */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Statut contact</p>
                {!isEditing ? (
                  <select
                    value={patient.contact || "À appeler"}
                    onChange={(e) => handleContactChange(e.target.value)}
                    className={`mt-2 px-3 py-1.5 rounded-lg text-sm font-semibold ${contactColors[patient.contact || "À appeler"]} cursor-pointer border-0`}
                    disabled={loading}
                  >
                    {CONTACT_STATUS_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                ) : (
                  <EditField label="" name="contact" options={CONTACT_STATUS_OPTIONS} formData={formData} setFormData={setFormData} />
                )}
              </div>
            </div>

            {/* Documents section */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-slate-100">
                <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                  <FileText size={18} className="text-cyan-600" />
                  Pièces manquantes
                </h2>
              </div>
              <div className="p-6">
                {!isEditing ? (
                  <p className="text-slate-600">{patient.pieces_manquantes || "Aucune pièce manquante signalée"}</p>
                ) : (
                  <EditField label="" name="pieces_manquantes" type="textarea" formData={formData} setFormData={setFormData} />
                )}
              </div>
            </div>

            {/* Notes section */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-slate-100">
                <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                  <FileText size={18} className="text-cyan-600" />
                  Notes médicales
                </h2>
              </div>
              <div className="p-6">
                {!isEditing ? (
                  <p className="text-slate-600 whitespace-pre-wrap">{patient.notes || "Aucune note"}</p>
                ) : (
                  <EditField label="" name="notes" type="textarea" formData={formData} setFormData={setFormData} />
                )}
              </div>
            </div>

            {/* Result section */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-slate-100">
                <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                  <CheckCircle size={18} className="text-emerald-600" />
                  Résultat
                </h2>
              </div>
              <div className="p-6">
                {!isEditing ? (
                  <p className="text-slate-600 whitespace-pre-wrap">{patient.resultat || "Aucun résultat enregistré"}</p>
                ) : (
                  <EditField label="" name="resultat" type="textarea" formData={formData} setFormData={setFormData} />
                )}
              </div>
            </div>
          </div>

          {/* Right column - Additional Info */}
          <div className="space-y-6">
            {/* Video URL Card */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-slate-100">
                <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                  <Video size={18} className="text-purple-600" />
                  Vidéo / Document
                </h2>
              </div>
              <div className="p-6">
                {!isEditing ? (
                  patient.video_url ? (
                    <a
                      href={patient.video_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-cyan-600 hover:text-cyan-700 flex items-center gap-2"
                    >
                      <Video size={16} />
                      Voir le document
                    </a>
                  ) : (
                    <p className="text-slate-400">Aucun document lié</p>
                  )
                ) : (
                  <EditField label="URL Vidéo / Document" name="video_url" formData={formData} setFormData={setFormData} />
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-slate-100">
                <h2 className="font-semibold text-slate-800">Actions rapides</h2>
              </div>
              <div className="p-4 space-y-2">
                <button
                  onClick={() => window.location.href = `tel:${patient.telephone}`}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-slate-50 rounded-xl text-slate-700 hover:bg-slate-100 transition"
                >
                  <Phone size={18} className="text-green-600" />
                  Appeler le patient
                </button>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(patient.id || "")
                    alert("ID copié dans le presse-papier")
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-slate-50 rounded-xl text-slate-700 hover:bg-slate-100 transition"
                >
                  <FileText size={18} className="text-blue-600" />
                  Copier l'ID patient
                </button>
                <button
                  onClick={handlePrintPdf}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-slate-50 rounded-xl text-slate-700 hover:bg-slate-100 transition"
                >
                  <Printer size={18} className="text-purple-600" />
                  Imprimer le dossier
                </button>
              </div>
            </div>

            {/* Doctor Info */}
            <div className="bg-gradient-to-r from-slate-800 to-slate-700 rounded-2xl p-5 text-white shadow-sm">
              <Stethoscope size={24} className="mb-3 opacity-80" />
              <h3 className="font-semibold text-lg">Dr. Abdelhamid Mayou</h3>
              <p className="text-slate-300 text-sm mt-1">Médecin traitant</p>
              <div className="mt-4 pt-4 border-t border-slate-600">
                <p className="text-xs text-slate-300">Dernière modification</p>
                <p className="text-sm">{formatDateTime(patient.created_at)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}