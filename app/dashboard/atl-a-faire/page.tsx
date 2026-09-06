import { supabase } from "@/lib/supabaseClient"
import PatientsClient from "../patients/PatientsClient"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function AtlToDoPage() {
  const { data: patients, error } = await supabase
    .from("patients")
    .select("*")
    .eq("type_de_cas", "ATL à faire")
    .order("created_at", { ascending: false })

  if (error) return <div className="p-8 text-rose-700">Erreur de chargement: {error.message}</div>

  return (
    <PatientsClient
      initialPatients={patients || []}
      pageTitle="ATL à faire"
      pageDescription="Patients dont l'angioplastie doit encore être planifiée ou réalisée."
    />
  )
}
