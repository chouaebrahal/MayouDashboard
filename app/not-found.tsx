// app/not-found.tsx
import Link from "next/link"
import { Home, SearchX } from "lucide-react"

export default function NotFound() {
  return (
    <main className="app-background flex min-h-svh items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-xl shadow-slate-900/5">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
          <SearchX size={28} />
        </div>
        <h1 className="mt-4 text-3xl font-bold text-slate-900">404</h1>
        <p className="mt-2 text-sm text-slate-600">
          La page que vous cherchez n&apos;existe pas ou a été déplacée.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-700"
        >
          <Home size={16} />
          Retour au tableau de bord
        </Link>
      </div>
    </main>
  )
}