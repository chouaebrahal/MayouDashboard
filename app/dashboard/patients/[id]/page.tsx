// app/patients/[id]/page.tsx (page détails à créer)
import { supabase } from "@/lib/supabaseClient"
import { notFound } from "next/navigation"
import PatientDetailsClient from "./PatientDetailsClient"

export default async function PatientDetailsPage({ params }: { params: { id: string } }) {
  const {id} = await params
  const { data: patient, error } = await supabase
    .from("patients")
    .select("*")
    .eq("id", id)
    .single()

  if (error || !patient) {
    notFound()
  }

  

  return <PatientDetailsClient patient={patient} />
}