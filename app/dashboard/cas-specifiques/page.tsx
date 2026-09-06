import { supabase } from "@/lib/supabaseClient"
import PatientsClient from "../patients/PatientsClient"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function SpecificCasesPage() {
  const { data: patients, error } = await supabase
    .from("patients")
    .select("*")
    .not("cas_specifique", "is", null)
    .neq("cas_specifique", "")
    .order("created_at", { ascending: false })

  if (error) return <div className="p-8 text-rose-700">Erreur de chargement: {error.message}</div>

  return (
    <PatientsClient
      initialPatients={patients || []}
      pageTitle="Cas spécifiques"
      pageDescription="Retrouvez les patients nécessitant une technique ou une prise en charge particulière."
      searchMode="cas-specifiques"
    />
  )
}
