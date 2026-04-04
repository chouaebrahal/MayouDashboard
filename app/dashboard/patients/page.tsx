// app/patients/page.tsx
import { supabase } from "@/lib/supabaseClient"
import { Patient } from "@/types/db"
import PatientsClient from "./PatientsClient"

// Force dynamic rendering — never serve a cached response for this page
export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function PatientsPage() {
  const { data: patients, error } = await supabase
    .from("patients")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) return <div>Error: {error.message}</div>

  return <PatientsClient initialPatients={patients || []} />
}