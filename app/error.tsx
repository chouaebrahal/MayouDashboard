// app/error.tsx
"use client"

import { useEffect } from "react"
import { AlertTriangle, RefreshCw, Home } from "lucide-react"
import Link from "next/link"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Application error:", error)
  }, [error])

  return (
    <main className="app-background flex min-h-svh items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-xl shadow-slate-900/5">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
          <AlertTriangle size={28} />
        </div>
        <h1 className="mt-4 text-xl font-bold text-slate-900">Une erreur est survenue</h1>
        <p className="mt-2 text-sm text-slate-600">
          Quelque chose s&apos;est mal passé. Vous pouvez réessayer ou revenir à l&apos;accueil.
        </p>
        {error?.digest && (
          <p className="mt-2 text-xs text-slate-400">Référence : {error.digest}</p>
        )}
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={reset}
            className="flex items-center justify-center gap-2 rounded-xl bg-cyan-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-700"
          >
            <RefreshCw size={16} />
            Réessayer
          </button>
          <Link
            href="/"
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <Home size={16} />
            Accueil
          </Link>
        </div>
      </div>
    </main>
  )
}