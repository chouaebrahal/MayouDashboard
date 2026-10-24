import { differenceInCalendarDays } from "date-fns"
import type { Patient } from "@/types/db"

/** Statuses that mean the dossier has not been deposited yet. */
export const PENDING_DOSSIER_STATUSES = ["statut inconnu", "dossier en préparation"]

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/

/**
 * Parses a date as LOCAL time. Supabase returns DATE columns as "YYYY-MM-DD";
 * `new Date("2026-10-01")` would be parsed as UTC and can shift by one day.
 */
export function parseLocalDate(value?: string | null): Date | null {
  if (!value) return null
  const date = new Date(DATE_ONLY.test(value) ? `${value}T00:00:00` : value)
  return Number.isNaN(date.getTime()) ? null : date
}

/**
 * Reference date for the "no dossier deposited" delay:
 * - the appointment date (`date`) when present,
 * - otherwise the date the patient was recorded (`created_at`).
 */
export function getDossierReferenceDate(
  patient: Pick<Patient, "date" | "created_at">
): Date | null {
  return parseLocalDate(patient.date) ?? parseLocalDate(patient.created_at)
}

/** True when the dossier has been pending for at least `days` days. */
export function isPendingDossierOverDays(
  patient: Pick<Patient, "statut_dossier" | "date" | "created_at">,
  days = 10,
  today: Date = new Date()
): boolean {
  const status = (patient.statut_dossier || "").trim().toLowerCase()
  if (!PENDING_DOSSIER_STATUSES.includes(status)) return false

  const reference = getDossierReferenceDate(patient)
  if (!reference) return false

  return differenceInCalendarDays(today, reference) >= days
}
