"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import { Patient } from "@/types/db"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import {
  ArrowLeft,
  Save,
  RotateCcw,
  Phone,
  Calendar,
  FileText,
  Stethoscope,
  CheckCircle,
  Clock,
  User,
  Video,
  Printer,
  Trash2,
  Loader2,
  Pencil,
  Tag,
} from "lucide-react"

interface PatientDetailsClientProps {
  patient: Patient
}

// ─── Option lists ─────────────────────────────────────────────────────────────

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

// ─── Color maps ───────────────────────────────────────────────────────────────

const statusColors: Record<string, string> = {
  "Dossier complet": "bg-emerald-600 text-white",
  "Fichiers manquants": "bg-amber-500 text-white",
  "Refus de l'assurance": "bg-rose-700 text-white",
  "Accord de l'assurance": "bg-green-700 text-white",
  "Transmis à l'assurance": "bg-blue-700 text-white",
  "Dossier en préparation": "bg-purple-700 text-white",
  "Statut inconnu": "bg-gray-500 text-white",
}

const typeCasColors: Record<string, string> = {
  "Non défini": "bg-slate-500 text-white",
  "Chirurgie": "bg-indigo-700 text-white",
  "Traitement médical": "bg-cyan-700 text-white",
  "Terminé / ATL réalisé": "bg-emerald-700 text-white",
  "ATL à faire": "bg-orange-600 text-white",
  "Urgence": "bg-rose-700 text-white",
  "Consultation": "bg-blue-700 text-white",
  "Suivi post-op": "bg-teal-700 text-white",
}

const contactColors: Record<string, string> = {
  "Contacté": "bg-green-700 text-white",
  "À appeler": "bg-yellow-500 text-white",
  "N'est pas joignable": "bg-red-700 text-white",
  "Rendez-vous pris": "bg-purple-700 text-white",
  "En attente de retour": "bg-orange-600 text-white",
}

// ─── Inline editable text field ───────────────────────────────────────────────

interface InlineFieldProps {
  value: string | null | undefined
  onChange: (val: string) => void
  multiline?: boolean
  placeholder?: string
  type?: string
  className?: string
}

function InlineField({ value, onChange, multiline, placeholder = "—", type = "text", className = "" }: InlineFieldProps) {
  const [editing, setEditing] = useState(false)
  const [local, setLocal] = useState(value ?? "")
  const ref = useRef<HTMLInputElement & HTMLTextAreaElement>(null)

  useEffect(() => { setLocal(value ?? "") }, [value])

  const commit = () => {
    onChange(local)
    setEditing(false)
    ref.current?.blur()
  }

  const commitAndFocusNext = (e: React.KeyboardEvent) => {
    e.preventDefault()
    commit()
  }

  const cancel = () => {
    setLocal(value ?? "")
    setEditing(false)
  }

  useEffect(() => {
    if (editing && ref.current) ref.current.focus()
  }, [editing])

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className={`group relative w-full text-left rounded-lg px-2 py-1.5 -mx-2 hover:bg-cyan-50 transition-colors duration-150 ${className}`}
      >
        <span className={value ? "text-slate-700 font-medium break-words" : "text-slate-400 italic"}>
          {value || placeholder}
        </span>
        <span className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Pencil size={12} className="text-cyan-500" />
        </span>
      </button>
    )
  }

  const sharedProps = {
    ref: ref as any,
    value: local,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setLocal(e.target.value),
    onBlur: commit,
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !multiline) { commitAndFocusNext(e) }
      if (e.key === "Enter" && multiline && (e.ctrlKey || e.metaKey)) { commitAndFocusNext(e) }
      if (e.key === "Escape") cancel()
    },
    className: `w-full px-3 py-2 rounded-lg border border-cyan-400 bg-cyan-50/60 text-slate-800 font-medium
      focus:outline-none focus:ring-2 focus:ring-cyan-400/40 shadow-sm transition-all text-sm resize-none`,
  }

  return multiline ? (
    <textarea {...sharedProps} rows={4} />
  ) : (
    <input {...sharedProps} type={type} />
  )
}

// ─── Colored select (instant save, always visible) ───────────────────────────

interface ColorSelectProps {
  value: string
  options: string[]
  colors: Record<string, string>
  onChange: (val: string) => void
  disabled?: boolean
}

function ColorSelect({ value, options, colors, onChange, disabled }: ColorSelectProps) {
  const color = colors[value] ?? "bg-slate-500 text-white"
  return (
    <div className="relative block w-full">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={`w-full h-10 appearance-none pl-3 pr-8 rounded-lg text-sm font-semibold cursor-pointer
          border-0 focus:outline-none focus:ring-2 focus:ring-white/40 shadow-sm transition-all
          disabled:opacity-60 disabled:cursor-not-allowed ${color}`}
      >
        {options.map((opt) => (
          <option key={opt} value={opt} className="bg-slate-800 text-white">
            {opt}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 opacity-70 text-xs">▾</span>
    </div>
  )
}

// ─── InfoRow ──────────────────────────────────────────────────────────────────

function InfoRow({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-slate-100 last:border-0 group">
      <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-300 shrink-0 mt-0.5 group-hover:bg-cyan-50 group-hover:text-cyan-500 transition-colors">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
        {children}
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function PatientDetailsClient({ patient: initialPatient }: PatientDetailsClientProps) {
  const router = useRouter()
  const [patient, setPatient] = useState<Patient>(initialPatient)
  const [dirty, setDirty] = useState<Partial<Patient>>({})   // only changed fields
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const successTimer = useRef<NodeJS.Timeout | null>(null)

  const isDirty = Object.keys(dirty).length > 0

  // Merge live patient view with pending dirty changes
  const live = { ...patient, ...dirty } as Patient

  const initials = `${(live.prenom?.trim()?.[0] ?? "")}${(live.nom?.trim()?.[0] ?? "")}`.toUpperCase()

  const patch = useCallback((field: keyof Patient, value: unknown) => {
    setDirty((prev) => {
      // If value equals original, remove from dirty
      if (value === (patient as any)[field]) {
        const next = { ...prev }
        delete next[field]
        return next
      }
      return { ...prev, [field]: value }
    })
  }, [patient])

  const handleSave = async () => {
    if (!isDirty) return
    setSaving(true)
    const { error } = await supabase.from("patients").update(dirty).eq("id", patient.id)
    if (!error) {
      setPatient((prev) => ({ ...prev, ...dirty }))
      setDirty({})
      setSaveSuccess(true)
      if (successTimer.current) clearTimeout(successTimer.current)
      successTimer.current = setTimeout(() => setSaveSuccess(false), 3000)
      router.refresh()
    } else {
      alert("Erreur lors de la sauvegarde: " + error.message)
    }
    setSaving(false)
  }

  const handleDiscard = () => setDirty({})

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey
      if (!mod) return
      const tag = (e.target as HTMLElement).tagName
      const isInField = tag === "INPUT" || tag === "TEXTAREA"
      // Ctrl+Enter outside a field → save
      if (e.key === "Enter" && isDirty && !saving && !isInField) {
        e.preventDefault()
        handleSave()
      }
      // Ctrl+Z outside a field → discard
      if (e.key === "z" && isDirty && !isInField) {
        e.preventDefault()
        handleDiscard()
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [isDirty, saving, dirty])

  // Instant-save for badge-selects (also marks dirty so user can batch if desired)
  const handleInstantField = async (field: keyof Patient, value: unknown) => {
    patch(field, value)
    // Optimistically update live view immediately
    setPatient((prev) => ({ ...prev, [field]: value }))
    // Persist right away for these quick-action selects
    await supabase.from("patients").update({ [field]: value }).eq("id", patient.id)
    // Remove from dirty (already persisted)
    setDirty((prev) => { const n = { ...prev }; delete n[field]; return n })
    router.refresh()
  }

  const handleDelete = async () => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce patient ? Cette action est irréversible.")) return
    setDeleting(true)
    const { error } = await supabase.from("patients").delete().eq("id", patient.id)
    if (!error) {
      router.push("/dashboard/patients")
      router.refresh()
    } else {
      alert("Erreur lors de la suppression: " + error.message)
      setDeleting(false)
    }
  }

  const formatDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—"

  const formatDateTime = (d: string | null) =>
    d ? new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"

  const handlePrintPdf = () => {
    const doc = new jsPDF()
    doc.setFontSize(24); doc.setFont("helvetica", "bold"); doc.setTextColor(30, 41, 59)
    doc.text("Dossier Patient", 14, 22)
    doc.setFontSize(10); doc.setFont("helvetica", "normal"); doc.setTextColor(100, 116, 139)
    doc.text("ClinicFlow", 14, 28)
    doc.setLineWidth(0.5); doc.setDrawColor(226, 232, 240); doc.line(14, 32, 196, 32)
    doc.setFontSize(16); doc.setFont("helvetica", "bold"); doc.setTextColor(15, 23, 42)
    doc.text(`${live.nom} ${live.prenom}`, 14, 42)
    doc.setFontSize(10); doc.setFont("helvetica", "normal"); doc.setTextColor(100, 116, 139)
    doc.text(`ID: ${live.id}`, 14, 48)
    doc.text(`Créé le: ${formatDateTime(live.created_at)}`, 14, 53)

    autoTable(doc, {
      startY: 62,
      head: [],
      body: [
        ["Âge", live.age ? `${live.age} ans` : "—"],
        ["Téléphone", live.telephone || "—"],
        ["Date de RDV", formatDate(live.date)],
        ["Médecin référant", live.referring_doctor || "—"],
        ["Type de cas", live.type_de_cas || "—"],
        ["CTO", live.cto ? "Oui" : "Non"],
        ["Cas spécifique", live.cas_specifique || "—"],
        ["Statut du dossier", live.statut_dossier || "—"],
        ["Statut de contact", live.contact || "—"],
      ],
      theme: "plain",
      styles: { fontSize: 10, cellPadding: 4, textColor: [51, 65, 85] },
      columnStyles: {
        0: { fontStyle: "bold", textColor: [15, 23, 42], cellWidth: 50 },
        1: { textColor: [71, 85, 105] },
      },
    })

    const finalY = (doc as any).lastAutoTable.finalY || 62
    let y = finalY + 15

    const addSection = (title: string, content: string | null | undefined) => {
      if (!content?.trim()) return
      if (y > 260) { doc.addPage(); y = 20 }
      doc.setFontSize(12); doc.setFont("helvetica", "bold"); doc.setTextColor(15, 23, 42)
      doc.text(title.toUpperCase(), 14, y)
      doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.5); doc.line(14, y + 2, 80, y + 2)
      y += 8
      doc.setFontSize(10); doc.setFont("helvetica", "normal"); doc.setTextColor(71, 85, 105)
      const lines = doc.splitTextToSize(content, 180)
      doc.text(lines, 14, y)
      y += lines.length * 5 + 12
    }

    addSection("Pièces Manquantes", live.pieces_manquantes)
    addSection("Notes Médicales", live.notes)
    addSection("Résultat", live.resultat)

    const pageCount = (doc as any).internal.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setFontSize(8); doc.setTextColor(148, 163, 184)
      doc.text(
        `ClinicFlow — Imprimé le ${new Date().toLocaleDateString("fr-FR")} — Page ${i} sur ${pageCount}`,
        doc.internal.pageSize.getWidth() / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: "center" }
      )
    }

    doc.save(`dossier_patient_${live.nom?.replace(/\s+/g, "_") || "Inconnu"}_${live.prenom?.replace(/\s+/g, "_") || "Inconnu"}.pdf`)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-blue-100/40">

      {/* ── Sticky top action bar ── */}
      <div className="sticky top-0 z-30 bg-white/85 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between gap-3 flex-wrap">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all duration-150 shrink-0"
          >
            <ArrowLeft size={18} />
            <span className="hidden sm:inline">Retour</span>
          </button>

          {/* Save / discard — only appears while there are unsaved changes */}
          <div className={`flex items-center gap-2 flex-wrap justify-center transition-all duration-300 ${isDirty ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
            <span className="flex items-center gap-1.5 text-xs text-slate-500">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
              <span className="hidden sm:inline">Modifications non enregistrées</span>
            </span>
            <button
              onClick={handleDiscard}
              disabled={saving}
              title="Annuler les modifications (Ctrl + Z)"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg shadow-sm transition disabled:opacity-50"
            >
              <RotateCcw size={12} />
              Annuler
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              title="Enregistrer (Ctrl + Entrée)"
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-semibold rounded-lg shadow-sm transition disabled:opacity-60"
            >
              {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
              {saving ? "Enregistrement…" : "Enregistrer"}
            </button>
          </div>

          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-xl font-medium hover:bg-rose-700 transition-all duration-150 shadow-sm disabled:opacity-60 shrink-0"
          >
            {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
            <span className="hidden sm:inline">Supprimer</span>
          </button>
        </div>
      </div>

      <div className="p-6 pb-16 max-w-7xl mx-auto">

        {/* ── Grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── LEFT: 2/3 ── */}
          <div className="lg:col-span-2 space-y-6">

            {/* Header card */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="bg-gradient-to-r from-cyan-600 to-blue-600 px-6 py-5">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-sm shrink-0 text-white font-bold text-lg">
                    {initials || <User size={28} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    {/* Nom + Prénom inline editable in header */}
                    <div className="flex gap-3 flex-wrap items-baseline">
                      <input
                        defaultValue={live.nom ?? ""}
                        onBlur={(e) => patch("nom", e.target.value)}
                        placeholder="Nom"
                        className="bg-transparent border-b border-white/40 text-white text-xl font-bold placeholder-white/50
                          focus:outline-none focus:border-white flex-1 min-w-[110px] max-w-[220px] pb-0.5 transition-colors"
                      />
                      <input
                        defaultValue={live.prenom ?? ""}
                        onBlur={(e) => patch("prenom", e.target.value)}
                        placeholder="Prénom"
                        className="bg-transparent border-b border-white/40 text-white text-xl font-bold placeholder-white/50
                          focus:outline-none focus:border-white flex-1 min-w-[110px] max-w-[220px] pb-0.5 transition-colors"
                      />
                    </div>
                    <p className="text-cyan-100 text-sm mt-1.5">ID: {live.id?.slice(0, 8)}</p>
                  </div>
                </div>
              </div>

              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-x-6">
                <InfoRow label="Âge" icon={<User size={15} />}>
                  <InlineField
                    value={live.age?.toString() ?? ""}
                    onChange={(v) => patch("age", v ? parseInt(v) : null)}
                    type="number"
                    placeholder="Non renseigné"
                  />
                </InfoRow>
                <InfoRow label="Téléphone" icon={<Phone size={15} />}>
                  <InlineField
                    value={live.telephone}
                    onChange={(v) => patch("telephone", v)}
                    type="tel"
                    placeholder="Non renseigné"
                  />
                </InfoRow>
                <InfoRow label="Date de rendez-vous" icon={<Calendar size={15} />}>
                  <InlineField
                    value={live.date ?? ""}
                    onChange={(v) => patch("date", v)}
                    type="date"
                    placeholder="—"
                  />
                </InfoRow>
                <InfoRow label="Médecin référant" icon={<Stethoscope size={15} />}>
                  <InlineField
                    value={live.referring_doctor}
                    onChange={(v) => patch("referring_doctor", v)}
                    placeholder="Non renseigné"
                  />
                </InfoRow>
                <InfoRow label="Créé le" icon={<Clock size={15} />}>
                  <span className="text-slate-600 text-sm font-medium">{formatDateTime(live.created_at)}</span>
                </InfoRow>
              </div>
            </div>

            {/* Classification & suivi — all badges grouped in one consistent card */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
                <Tag size={17} className="text-indigo-600" />
                <h2 className="font-semibold text-slate-800">Classification &amp; suivi</h2>
              </div>
              <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: "Type de cas", field: "type_de_cas" as keyof Patient, options: TYPE_CAS_OPTIONS, colors: typeCasColors, fallback: "Non défini" },
                  { label: "Statut dossier", field: "statut_dossier" as keyof Patient, options: STATUT_DOSSIER_OPTIONS, colors: statusColors, fallback: "Statut inconnu" },
                  { label: "Statut contact", field: "contact" as keyof Patient, options: CONTACT_STATUS_OPTIONS, colors: contactColors, fallback: "À appeler" },
                ].map(({ label, field, options, colors, fallback }) => (
                  <div key={field} className="bg-slate-50 rounded-xl border border-slate-100 p-3.5 flex flex-col">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{label}</p>
                    <ColorSelect
                      value={(live[field] as string) || fallback}
                      options={options}
                      colors={colors}
                      onChange={(v) => handleInstantField(field, v)}
                    />
                  </div>
                ))}

                <div className="bg-slate-50 rounded-xl border border-slate-100 p-3.5 flex flex-col">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">CTO</p>
                  <button
                    type="button"
                    onClick={() => handleInstantField("cto", !live.cto)}
                    className={`w-full h-10 flex items-center justify-between gap-2 px-3 rounded-lg text-sm font-semibold shadow-sm transition-colors ${
                      live.cto ? "bg-rose-700 text-white" : "bg-slate-200 text-slate-600 hover:bg-slate-300"
                    }`}
                  >
                    <span>{live.cto ? "Lésion CTO" : "Pas de CTO"}</span>
                    <span className={`w-8 h-4 rounded-full relative shrink-0 transition-colors ${live.cto ? "bg-white/30" : "bg-white"}`}>
                      <span
                        className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full transition-transform ${
                          live.cto ? "translate-x-4 bg-white" : "bg-slate-400"
                        }`}
                      />
                    </span>
                  </button>
                </div>

                <div className="bg-slate-50 rounded-xl border border-slate-100 p-3.5 sm:col-span-2 lg:col-span-4">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Cas spécifique</p>
                  <InlineField
                    value={live.cas_specifique || ""}
                    onChange={(value) => patch("cas_specifique", value || null)}
                    placeholder="Ex. IVUS, OCT, bifurcation..."
                  />
                </div>
              </div>
            </div>

            {/* Text sections */}
            {[
              { title: "Pièces manquantes", icon: <FileText size={17} className="text-amber-500" />, field: "pieces_manquantes" as keyof Patient, placeholder: "Aucune pièce manquante signalée" },
              { title: "Notes médicales", icon: <FileText size={17} className="text-cyan-600" />, field: "notes" as keyof Patient, placeholder: "Aucune note" },
              { title: "Résultat", icon: <CheckCircle size={17} className="text-emerald-600" />, field: "resultat" as keyof Patient, placeholder: "Aucun résultat enregistré" },
            ].map(({ title, icon, field, placeholder }) => (
              <div key={field} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
                  {icon}
                  <h2 className="font-semibold text-slate-800">{title}</h2>
                </div>
                <div className="p-5">
                  <InlineField
                    value={live[field] as string}
                    onChange={(v) => patch(field, v)}
                    multiline
                    placeholder={placeholder}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* ── RIGHT: 1/3 ── */}
          <div className="space-y-6">

            {/* Video/doc */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
                <Video size={17} className="text-purple-600" />
                <h2 className="font-semibold text-slate-800">Vidéo / Document</h2>
              </div>
              <div className="p-5 space-y-3">
                <InlineField
                  value={live.video_url}
                  onChange={(v) => patch("video_url", v)}
                  placeholder="Coller un lien URL…"
                />
                {live.video_url && (
                  <a
                    href={live.video_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-cyan-600 hover:text-cyan-700 font-medium"
                  >
                    <Video size={14} />
                    Ouvrir le document
                  </a>
                )}
              </div>
            </div>

            {/* Quick actions */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-slate-100">
                <h2 className="font-semibold text-slate-800">Actions rapides</h2>
              </div>
              <div className="p-4 space-y-2">
                <button
                  onClick={() => { window.location.href = `tel:${live.telephone}` }}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-slate-50 rounded-xl text-slate-700 hover:bg-green-50 hover:text-green-700 transition-all duration-150 text-sm font-medium"
                >
                  <span className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
                    <Phone size={15} className="text-green-600" />
                  </span>
                  Appeler le patient
                </button>
                <button
                  onClick={() => { navigator.clipboard.writeText(live.id || ""); alert("ID copié !") }}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-slate-50 rounded-xl text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-all duration-150 text-sm font-medium"
                >
                  <span className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                    <FileText size={15} className="text-blue-600" />
                  </span>
                  Copier l'ID patient
                </button>
                <button
                  onClick={handlePrintPdf}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-slate-50 rounded-xl text-slate-700 hover:bg-purple-50 hover:text-purple-700 transition-all duration-150 text-sm font-medium"
                >
                  <span className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center shrink-0">
                    <Printer size={15} className="text-purple-600" />
                  </span>
                  Imprimer le dossier
                </button>
              </div>
            </div>

            {/* Doctor card */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl p-5 text-white shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center mb-3">
                <Stethoscope size={20} className="opacity-80" />
              </div>
              <h3 className="font-semibold text-lg leading-tight">Dr. Abdelhamid Mayou</h3>
              <p className="text-slate-300 text-sm mt-1">Médecin traitant</p>
              <div className="mt-4 pt-4 border-t border-slate-600/60">
                <p className="text-xs text-slate-400 flex items-center gap-1.5">
                  <Clock size={11} />
                  Créé le
                </p>
                <p className="text-sm text-slate-200 mt-0.5">{formatDateTime(live.created_at)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Save success toast ── */}
      <div
        className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-xl
          transition-all duration-500 ${saveSuccess ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"}`}
      >
        <CheckCircle size={18} />
        <span className="text-sm font-semibold">Dossier enregistré avec succès</span>
      </div>
    </div>
  )
}