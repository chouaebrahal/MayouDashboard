export type Admin = {
  id: string
  created_at: string
  nom: string | null
  prenom: string | null
  email: string | null
  username: string | null
  password: string | null
}

export type Doctor = {
  id: string
  created_at: string
  nom: string | null
  prenom: string | null
  email: string | null
  telephone: string | null
  password: string | null
  username: string | null
}

export type Patient = {
  id: string
  created_at: string
  nom: string | null
  prenom: string | null
  age: number | null
  telephone: string | null
  date: string | null // PostgreSQL DATE → string
  type_de_cas: string | null
  contact: string | null
  statut_dossier: string | null
  pieces_manquantes: string | null
  notes: string | null
  resultat: string | null
  doctor_id: string | null
  video_url: string | null
  referring_doctor: string | null
}
