// components/ConfirmDialog.tsx
"use client"

import { useEffect, useRef } from "react"
import { AlertTriangle, Loader2, X } from "lucide-react"

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirmer",
  cancelLabel = "Annuler",
  danger = false,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    const prev = document.activeElement as HTMLElement | null
    confirmRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) onCancel()
    }
    document.addEventListener("keydown", onKey)
    // Prevent background scroll
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = prevOverflow
      prev?.focus?.()
    }
  }, [open, loading, onCancel])

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      aria-describedby="confirm-message"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
    >
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => !loading && onCancel()}
      />
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl shadow-slate-900/20 dark:border-slate-700">
        <button
          type="button"
          onClick={() => !loading && onCancel()}
          aria-label="Fermer"
          className="absolute right-3 top-3 rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
        >
          <X size={16} />
        </button>
        <div className="flex items-start gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
              danger ? "bg-rose-100 text-rose-600" : "bg-cyan-100 text-cyan-600"
            }`}
          >
            <AlertTriangle size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <h2 id="confirm-title" className="text-base font-semibold text-slate-900">
              {title}
            </h2>
            <p id="confirm-message" className="mt-1 text-sm text-slate-600">
              {message}
            </p>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-white transition disabled:opacity-60 ${
              danger
                ? "bg-rose-600 hover:bg-rose-700"
                : "bg-cyan-600 hover:bg-cyan-700"
            }`}
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}