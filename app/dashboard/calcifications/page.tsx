import { supabase } from "@/lib/supabaseClient"
import PatientsClient from "../patients/PatientsClient"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function CalcificationPatientsPage() {
  const { data: patients, error } = await supabase
    .from("patients")
    .select("*")
    .eq("calcification_coronaire", true)
    .order("created_at", { ascending: false })

  if (error) return <div className="p-8 text-rose-700">Erreur de chargement: {error.message}</div>

  return (
    <PatientsClient
      initialPatients={patients || []}
      pageTitle="Patients calcification"
      pageDescription="Patients présentant une calcification coronaire signalée par le cardiologue."
    />
  )
}