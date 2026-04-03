// app/dashboard/page.tsx
import { supabase } from "@/lib/supabaseClient"
import DashboardClient from "./DashboardClient"

export default async function DashboardPage() {
  // Récupération de toutes les données nécessaires
  const [
    { data: patients, error: patientsError },
    { data: doctors, error: doctorsError },
    { data: admins, error: adminsError }
  ] = await Promise.all([
    supabase.from("patients").select("*"),
    supabase.from("doctors").select("*"),
    supabase.from("admins").select("*")
  ])

  if (patientsError || doctorsError || adminsError) {
    console.error("Erreur de chargement:", { patientsError, doctorsError, adminsError })
  }

  return (
    <DashboardClient 
      initialPatients={patients || []}
      initialDoctors={doctors || []}
      initialAdmins={admins || []}
    />
  )
}