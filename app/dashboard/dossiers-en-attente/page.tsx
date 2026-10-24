import { supabase } from "@/lib/supabaseClient"
import PatientsClient from "../patients/PatientsClient"
import { isPendingDossierOverDays } from "@/lib/pendingDossiers"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function PendingDossiersPage() {
  const { data: patients, error } = await supabase
    .from("patients")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) return <div className="p-8 text-rose-700">Erreur de chargement: {error.message}</div>

  const today = new Date()
  const pendingPatients = (patients || []).filter((p) =>
    isPendingDossierOverDays(p, 10, today)
  )

  return (
    <PatientsClient
      initialPatients={pendingPatients}
      pageTitle="Dossiers en attente > 10 jours"
      pageDescription="Patients avec statut 'Statut inconnu' ou 'Dossier en préparation' plus de 10 jours après leur intervention, sans dépôt de dossier."
    />
  )
}
