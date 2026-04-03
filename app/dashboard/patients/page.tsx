// app/patients/page.tsx
import { supabase } from "@/lib/supabaseClient"
import { Patient } from "@/types/db"
import PatientsClient from "./PatientsClient"

export default async function PatientsPage() {
  const { data: patients, error } = await supabase
    .from("patients")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) return <div>Error: {error.message}</div>

  return <PatientsClient initialPatients={patients || []} />
}