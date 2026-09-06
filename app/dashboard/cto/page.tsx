import { supabase } from "@/lib/supabaseClient"
import PatientsClient from "../patients/PatientsClient"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function CtoPatientsPage() {
  const { data: patients, error } = await supabase
    .from("patients")
    .select("*")
    .eq("cto", true)
    .order("created_at", { ascending: false })

  if (error) return <div className="p-8 text-rose-700">Erreur de chargement: {error.message}</div>

  return (
    <PatientsClient
      initialPatients={patients || []}
      pageTitle="Patients CTO"
      pageDescription="Patients présentant une occlusion totale chronique à suivre séparément."
    />
  )
}
