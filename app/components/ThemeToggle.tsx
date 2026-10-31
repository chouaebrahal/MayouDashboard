"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "./ThemeProvider";

export default function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  const nextThemeLabel = theme === "light" ? "Activer le thème sombre" : "Activer le thème clair";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={nextThemeLabel}
      title={nextThemeLabel}
      className={`inline-flex h-11 min-w-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-slate-700 transition hover:border-blue-300 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${className}`}
    >
      {theme === "light" ? <Moon size={18} aria-hidden="true" /> : <Sun size={18} aria-hidden="true" />}
      <span className="sr-only">{nextThemeLabel}</span>
    </button>
  );
}
